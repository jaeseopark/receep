import classNames from "classnames";
import { CircleCheck } from "lucide-preact";
import { useNavigate } from "react-router-dom";

import { Receipt } from "@/types";

import { ReceiptThumbnail } from "@/components/receipts/ReceiptImg";
import { toRelativeTime } from "@/utils/dates";
import { getEditReceiptPath } from "@/utils/paths";

const ReceiptCard = ({ receipt, onClickOverride }: { receipt: Receipt; onClickOverride?: () => void }) => {
  const { id, created_at, transactions } = receipt;
  const navigate = useNavigate();

  const isVetted = transactions && transactions.length > 0;

  return (
    <div
      key={id}
      className={classNames("receipt-card card bg-base-100 w-48 h-72 shadow-sm", {
        vetted: isVetted,
      })}
      onClick={onClickOverride || (() => navigate(getEditReceiptPath(id)))}
    >
      <figure className="h-64 bg-gray-100">
        <ReceiptThumbnail receipt={receipt} />
      </figure>
      <div className="card-body m-0 p-0 justify-center">
        <h2 className="card-title justify-center">
          {isVetted && <CircleCheck className="text-green-500" />}
          {toRelativeTime(created_at)}
        </h2>
      </div>
    </div>
  );
};

export default ReceiptCard;
