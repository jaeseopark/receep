import { ReactNode } from "preact/compat";

import Dock from "@/components/layout/Dock";

const AppFrame = ({ children }: { children: ReactNode }) => {
  return (
    <>
      <div className="app-content pb-[4.5rem]">{children}</div>
      <Dock />
    </>
  );
};

export default AppFrame;
