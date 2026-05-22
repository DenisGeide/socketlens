import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  createEnvironment,
  createEnvironmentProfile,
  createEnvironmentVariable,
  duplicateEnvironment,
  getActiveEnvironment,
  normalizeEnvironmentsState,
  type AppEnvironment,
  type EnvironmentConnectionProfile,
  type EnvironmentVariable,
  type EntityId,
} from "@/models";

type EnvironmentStore = {
  activeEnvironmentId: EntityId;
  addConnectionProfile: (environmentId: EntityId) => void;
  addEnvironment: () => AppEnvironment;
  addVariable: (environmentId: EntityId) => void;
  deleteConnectionProfile: (environmentId: EntityId, profileId: EntityId) => void;
  deleteEnvironment: (environmentId: EntityId) => void;
  deleteVariable: (environmentId: EntityId, variableId: EntityId) => void;
  duplicateEnvironment: (environmentId: EntityId) => AppEnvironment | null;
  environments: AppEnvironment[];
  replaceEnvironments: (environments: AppEnvironment[], activeEnvironmentId?: EntityId | null) => void;
  setActiveEnvironment: (environmentId: EntityId) => void;
  updateConnectionProfile: (
    environmentId: EntityId,
    profileId: EntityId,
    patch: Partial<Pick<EnvironmentConnectionProfile, "endpointUrl" | "name">>,
  ) => void;
  updateEnvironment: (environmentId: EntityId, patch: Partial<Pick<AppEnvironment, "description" | "name">>) => void;
  updateVariable: (
    environmentId: EntityId,
    variableId: EntityId,
    patch: Partial<Pick<EnvironmentVariable, "isSecret" | "key" | "value">>,
  ) => void;
};

type PersistedEnvironmentState = Pick<EnvironmentStore, "activeEnvironmentId" | "environments">;

const initialState = normalizeEnvironmentsState({});

export const useEnvironmentStore = create<EnvironmentStore>()(
  persist(
    (set, get) => ({
      activeEnvironmentId: initialState.activeEnvironmentId,
      addConnectionProfile: (environmentId) => {
        set((state) => ({
          environments: updateEnvironmentById(state.environments, environmentId, (environment) => ({
            ...environment,
            connectionProfiles: [...environment.connectionProfiles, createEnvironmentProfile()],
            updatedAt: Date.now(),
          })),
        }));
      },
      addEnvironment: () => {
        const environment = createEnvironment();

        set((state) => ({
          activeEnvironmentId: environment.id,
          environments: [...state.environments, environment],
        }));

        return environment;
      },
      addVariable: (environmentId) => {
        set((state) => ({
          environments: updateEnvironmentById(state.environments, environmentId, (environment) => ({
            ...environment,
            updatedAt: Date.now(),
            variables: [
              ...environment.variables,
              createEnvironmentVariable({
                key: createUniqueVariableKey(environment.variables),
                value: "",
              }),
            ],
          })),
        }));
      },
      deleteConnectionProfile: (environmentId, profileId) => {
        set((state) => ({
          environments: updateEnvironmentById(state.environments, environmentId, (environment) => ({
            ...environment,
            connectionProfiles: environment.connectionProfiles.filter((profile) => profile.id !== profileId),
            updatedAt: Date.now(),
          })),
        }));
      },
      deleteEnvironment: (environmentId) => {
        set((state) => {
          if (state.environments.length <= 1) {
            return state;
          }

          const environments = state.environments.filter((environment) => environment.id !== environmentId);
          const activeEnvironment = getActiveEnvironment(environments, state.activeEnvironmentId);

          return {
            activeEnvironmentId: state.activeEnvironmentId === environmentId ? (activeEnvironment?.id ?? environments[0]?.id) : state.activeEnvironmentId,
            environments,
          };
        });
      },
      deleteVariable: (environmentId, variableId) => {
        set((state) => ({
          environments: updateEnvironmentById(state.environments, environmentId, (environment) => ({
            ...environment,
            updatedAt: Date.now(),
            variables: environment.variables.filter((variable) => variable.id !== variableId),
          })),
        }));
      },
      duplicateEnvironment: (environmentId) => {
        const source = get().environments.find((environment) => environment.id === environmentId);

        if (!source) {
          return null;
        }

        const environment = duplicateEnvironment(source);

        set((state) => ({
          activeEnvironmentId: environment.id,
          environments: [...state.environments, environment],
        }));

        return environment;
      },
      environments: initialState.environments,
      replaceEnvironments: (environments, activeEnvironmentId = null) => {
        const normalized = normalizeEnvironmentsState({ activeEnvironmentId, environments });

        set(normalized);
      },
      setActiveEnvironment: (environmentId) => {
        set((state) => {
          if (!state.environments.some((environment) => environment.id === environmentId)) {
            return state;
          }

          return {
            activeEnvironmentId: environmentId,
          };
        });
      },
      updateConnectionProfile: (environmentId, profileId, patch) => {
        set((state) => ({
          environments: updateEnvironmentById(state.environments, environmentId, (environment) => ({
            ...environment,
            connectionProfiles: environment.connectionProfiles.map((profile) =>
              profile.id === profileId
                ? {
                    ...profile,
                    endpointUrl: patch.endpointUrl ?? profile.endpointUrl,
                    name: patch.name ?? profile.name,
                  }
                : profile,
            ),
            updatedAt: Date.now(),
          })),
        }));
      },
      updateEnvironment: (environmentId, patch) => {
        set((state) => ({
          environments: updateEnvironmentById(state.environments, environmentId, (environment) => ({
            ...environment,
            description: patch.description ?? environment.description,
            name: patch.name ?? environment.name,
            updatedAt: Date.now(),
          })),
        }));
      },
      updateVariable: (environmentId, variableId, patch) => {
        set((state) => ({
          environments: updateEnvironmentById(state.environments, environmentId, (environment) => ({
            ...environment,
            updatedAt: Date.now(),
            variables: environment.variables.map((variable) =>
              variable.id === variableId
                ? {
                    ...variable,
                    isSecret: patch.isSecret ?? variable.isSecret,
                    key: patch.key ?? variable.key,
                    value: patch.value ?? variable.value,
                  }
                : variable,
            ),
          })),
        }));
      },
    }),
    {
      name: "socketlens.environments.v1",
      partialize: (state): PersistedEnvironmentState => ({
        activeEnvironmentId: state.activeEnvironmentId,
        environments: state.environments,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<PersistedEnvironmentState>;
        const normalized = normalizeEnvironmentsState({
          activeEnvironmentId: persisted.activeEnvironmentId,
          environments: persisted.environments,
        });

        return {
          ...currentState,
          ...normalized,
        };
      },
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);

export function getCurrentEnvironment() {
  const state = useEnvironmentStore.getState();

  return getActiveEnvironment(state.environments, state.activeEnvironmentId);
}

function updateEnvironmentById(
  environments: AppEnvironment[],
  environmentId: EntityId,
  updater: (environment: AppEnvironment) => AppEnvironment,
) {
  return environments.map((environment) => (environment.id === environmentId ? updater(environment) : environment));
}

function createUniqueVariableKey(variables: EnvironmentVariable[]) {
  const existingKeys = new Set(variables.map((variable) => variable.key));
  let index = 1;
  let key = "variable";

  while (existingKeys.has(key)) {
    index += 1;
    key = `variable_${index}`;
  }

  return key;
}
