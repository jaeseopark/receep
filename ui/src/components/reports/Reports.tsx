import { useNavigate } from "react-router-dom";

const Reports = () => {
  const navigate = useNavigate();

  return (
    <div>
      <button onClick={() => navigate("/reports/expenses-by-category")}>Expenses By Category</button>
    </div>
  );
};

export default Reports;
