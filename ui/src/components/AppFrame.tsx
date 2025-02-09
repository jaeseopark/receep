import { ReactNode } from "preact/compat";

import Navbar from "@/components/Navbar";

const AppFrame = ({ children }: { children: ReactNode }) => {
  return (
    <div>
      <Navbar />
      {children}
    </div>
  );
};

export default AppFrame;
