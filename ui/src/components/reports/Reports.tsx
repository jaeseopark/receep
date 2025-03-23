import { ExternalLinkIcon } from "lucide-preact";
import { useNavigate } from "react-router-dom";

const Reports = ({ reportRoutes }: { reportRoutes: { path: string; name: string; description: string }[] }) => {
  const navigate = useNavigate();

  return (
    <div className="m-4">
      {reportRoutes.map(({ path, name, description }) => {
        return (
          <div key={path} className="collapse collapse-plus bg-base-100 border border-base-300">
            <input type="radio" name="my-accordion-3" defaultChecked />
            <div className="collapse-title font-semibold">{name}</div>
            <div className="collapse-content text-sm">
              <button className="flex items-center hover:underline" onClick={() => navigate(path)}>
                <span>{description}</span>
                <ExternalLinkIcon className="scale-75" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Reports;
