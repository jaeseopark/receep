import { ReactNode } from "preact/compat";

import Dock from "@/components/Dock";

const AppFrame = ({ children }: { children: ReactNode }) => {
  return (
    <>
      <div className="app-content mb-[4.5rem]">{children}</div>
      <Dock />
    </>
  );
};

export default AppFrame;
