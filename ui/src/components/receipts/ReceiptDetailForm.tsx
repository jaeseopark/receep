import { Link, SquareArrowOutUpRight } from "lucide-preact";

import { Receipt } from "@/types";

import { toRelativeTime } from "@/utils/dates";
import { toHumanFilesize } from "@/utils/primitive";

const ReceiptDetailForm = ({ receipt }: { receipt: Receipt }) => {
  return (
    <table className="table h-fit">
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
            <a className="ml-2" href={`/transactions/new?receipt_id=${receipt.id}`}>
              <button className="btn btn-sm rounded-full">
                <Link className="scale-50" />
              </button>
            </a>
          </th>
          <td>
            <div>
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
