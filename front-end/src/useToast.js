import { createContext, useContext } from "react";

export const ToastContext = createContext(null);

export default function useToast() {
  return useContext(ToastContext);
}
