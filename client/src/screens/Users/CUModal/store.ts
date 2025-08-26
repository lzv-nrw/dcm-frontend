import { create } from "zustand";

import { User } from "../../../types";
import {
  createValidateWithChildren,
  mergeValidationReportIntoChildren,
  ValidationReportWithChildren,
  Validator,
} from "../../../utils/forms";
import {
  Data,
  DataFormChildren,
  DataFormValidator,
  validateEmail,
  validateNonEmptyText,
} from "./DataForm";
import { Groups, GroupsFormValidator } from "./GroupsForm";

export interface FormData {
  id?: string;
  data?: Data;
  groups?: Groups;
}

type FormChildren = "data" | "groups";
type FormValidator = Validator<FormChildren>;

export interface FormStore extends FormData {
  validator: FormValidator;
  setCurrentValidationReport: (
    report: ValidationReportWithChildren<FormChildren>
  ) => void;
  setId: (id?: string) => void;
  setData: (data: Data, replace?: boolean) => void;
  setGroups: (groups: Groups, replace?: boolean) => void;
  initFromConfig: (user: User) => void;
  formatToConfig: () => Omit<User, "id"> & { id?: string }; // this changes the User.id (occurring in submissions) to optional
}

export const useFormStore = create<FormStore>()((set, get) => ({
  validator: {
    validate: createValidateWithChildren<FormChildren>(() => get().validator),
    children: {
      data: {
        validate: createValidateWithChildren<DataFormChildren>(
          () => get().validator.children?.data,
          (strict) => {
            if (strict) return { ok: true };
            return {};
          }
        ),
        children: {
          username: {
            validate: (strict: boolean) =>
              validateNonEmptyText(
                strict,
                get().data?.username,
                "Benutzername"
              ),
          },
          firstname: {
            validate: (strict: boolean) =>
              validateNonEmptyText(strict, get().data?.firstname, "Vorname"),
          },
          lastname: {
            validate: (strict: boolean) =>
              validateNonEmptyText(strict, get().data?.lastname, "Nachname"),
          },
          email: {
            validate: (strict: boolean) =>
              validateEmail(strict, get().data?.email),
          },
        },
      } as DataFormValidator,
      groups: {
        validate: createValidateWithChildren<DataFormChildren>(
          () => get().validator.children?.groups,
          (strict) => {
            if (strict) return { ok: true };
            return {};
          }
        ),
      } as GroupsFormValidator,
    },
  } as FormValidator,
  setCurrentValidationReport: (report) =>
    set({
      validator: mergeValidationReportIntoChildren(get().validator, report),
    }),
  setId: (id) => set({ id }),
  setData: (data, replace = false) =>
    replace ? set({ data }) : set({ data: { ...get().data, ...data } }),
  setGroups: (groups, replace = false) =>
    replace ? set({ groups }) : set({ groups: { ...get().groups, ...groups } }),
  initFromConfig: (user: User) => {
    const store = get();
    store.setId(user.id);
    store.setData(
      {
        username: user.username,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
      },
      true
    );
    store.setGroups(
      {
        memberships: user.groups,
      },
      true
    );
  },
  formatToConfig: () => {
    const store = get();
    return {
      id: store.id,
      username: store.data?.username,
      firstname: store.data?.firstname,
      lastname: store.data?.lastname,
      email: store.data?.email,
      groups: store.groups?.memberships,
    };
  },
}));
