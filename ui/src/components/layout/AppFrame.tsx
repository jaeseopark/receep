import { ReactNode } from "preact/compat";

import Dock from "@/components/layout/Dock";

const AppFrame = ({ children }: { children: ReactNode }) => {
  return (
    <>
      <div className="app-content">{children}</div>
      <Dock />
    </>
  );
};

export default AppFrame;
