import { Link, SquareArrowOutUpRight } from "lucide-preact";

import { Receipt } from "@/types";

import { toRelativeTime } from "@/utils/dates";
import { toHumanFilesize } from "@/utils/primitive";

const ReceiptDetailForm = ({ receipt }: { receipt: Receipt }) => {
  return (
    <table className="table h-fit w-auto md:w-max-[50%]">
      <tbody>
        <tr>
          <th>Upload Timestamp</th>
          <td>{toRelativeTime(receipt.created_at)}</td>
        </tr>
        <tr>
          <th>Data Type</th>
          <td>{receipt.content_type}</td>
        </tr>
        <tr>
          <th>File Size</th>
          <td>{toHumanFilesize(receipt.content_length)}</td>
        </tr>
        <tr>
          <th>
            Transaction(s)
            <button
              className="btn btn-sm rounded-full"
              onClick={() => {
                // TODO: open modal to select a transaction
              }}
            >
              <Link className="scale-50" />
            </button>
          </th>
          <td>
            <div>
              {receipt.transactions.length === 0 && <span>None</span>}
              {receipt.transactions.map((t) => (
                <a key={t.id} className="link flex" href={`/transactions/edit/${t.id}`}>
                  TxID {t.id} <SquareArrowOutUpRight className="scale-50" />
                </a>
              ))}
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  );
};

export default ReceiptDetailForm;
