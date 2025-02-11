import { CircleCheck } from "lucide-preact";
import { useNavigate } from "react-router-dom";

import { Receipt } from "@/types";

import { ReceiptThumbnail } from "@/components/receipts/ReceiptImg";
import { toRelativeTime } from "@/utils/dates";

const ReceiptCard = ({ receipt, onClickOverride }: { receipt: Receipt; onClickOverride?: () => void }) => {
  const { id, created_at, transactions } = receipt;
  const navigate = useNavigate();

  return (
    <div
      key={id}
      className="card bg-base-100 w-48 h-72 shadow-sm"
      onClick={onClickOverride || (() => navigate(`/receipts/edit/${id}`))}
    >
      <figure className="h-64 bg-gray-100">
        <ReceiptThumbnail receipt={receipt} />
      </figure>
      <div className="card-body m-0 p-0 justify-center">
        <h2 className="card-title justify-center">
          {(transactions || []).length > 0 && <CircleCheck />}
          {toRelativeTime(created_at)}
        </h2>
      </div>
    </div>
  );
};

export default ReceiptCard;
