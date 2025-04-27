import { SquareArrowOutUpRight } from "lucide-preact";
import { useNavigate } from "react-router-dom";

import { Receipt } from "@/types";

import { toRelativeTime } from "@/utils/dates";
import { getEditTransactionPath } from "@/utils/paths";
import { toHumanFilesize } from "@/utils/primitive";

const ReceiptDetailForm = ({
  receipt: { created_at, content_type, content_length, transactions },
}: {
  receipt: Receipt;
}) => {
  const navigate = useNavigate();

  return (
    <table className="table h-fit w-auto md:w-max-[50%]">
      <tbody>
        <tr>
          <th>Upload Timestamp</th>
          <td>{toRelativeTime(created_at)}</td>
        </tr>
        <tr>
          <th>Data Type</th>
          <td>{content_type}</td>
        </tr>
        <tr>
          <th>File Size</th>
          <td>{toHumanFilesize(content_length)}</td>
        </tr>
        <tr>
          <th>Transaction(s)</th>
          <td>
            <div>
              {transactions.length === 0 && <span>None</span>}
              {transactions.map((t) => (
                <div key={t.id} onClick={() => navigate(getEditTransactionPath(t.id))}>
                  TxID {t.id} <SquareArrowOutUpRight className="scale-50" />
                </div>
              ))}
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  );
};

export default ReceiptDetailForm;
