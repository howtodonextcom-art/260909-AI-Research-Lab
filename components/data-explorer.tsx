"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DRAW_EXPLORER_RESULT_CAP, filterDraws } from "@/lib/data/explorer";
import { formatBall } from "@/lib/mega645";
import type { DrawRecord } from "@/lib/data/types";

function formatDateVi(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString("vi-VN", { timeZone: "UTC" });
}

/**
 * Data Explorer (blueprint G1): search the dataset the app has already
 * loaded (`draws`, from `useDrawData()`) by draw id prefix and/or date
 * range. Pure client-side array filtering — `lib/data/explorer.ts`'s
 * `filterDraws` — no server round-trip and no "search API": the whole
 * dataset is already in memory, so a server call would just add latency.
 */
export function DataExplorer({ draws }: { draws: DrawRecord[] }) {
  const [idQuery, setIdQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const { matches, totalMatches } = useMemo(
    () => filterDraws(draws, { idQuery, fromDate, toDate }),
    [draws, idQuery, fromDate, toDate],
  );

  const hasQuery = idQuery.trim().length > 0 || fromDate.length > 0 || toDate.length > 0;
  const hiddenCount = Math.max(0, totalMatches - matches.length);

  return (
    <section className="analysis-card explorer-card" aria-labelledby="data-explorer-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Tra cứu dữ liệu</p>
          <h2 id="data-explorer-heading">Tìm kỳ quay theo mã kỳ hoặc khoảng ngày</h2>
        </div>
        <Badge variant="outline">{draws.length.toLocaleString("vi-VN")} kỳ trong bộ nhớ</Badge>
      </div>
      <p className="method-note">
        <Search aria-hidden="true" />
        <span>
          Tìm kiếm chạy hoàn toàn trên dữ liệu đã tải sẵn trong trình duyệt của bạn — không gửi truy vấn lên máy chủ.
          Để trống cả ba ô sẽ không hiển thị gì, tránh đổ toàn bộ {draws.length.toLocaleString("vi-VN")} kỳ ra màn hình
          cùng lúc.
        </span>
      </p>
      <div className="explorer-form">
        <div className="explorer-field">
          <label htmlFor="explorer-id">Mã kỳ (chính xác hoặc tiền tố)</label>
          <Input
            id="explorer-id"
            placeholder="Ví dụ: 01561 hoặc 015"
            value={idQuery}
            onChange={(event) => setIdQuery(event.target.value)}
            inputMode="numeric"
          />
        </div>
        <div className="explorer-field">
          <label htmlFor="explorer-from">Từ ngày</label>
          <Input id="explorer-from" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
        </div>
        <div className="explorer-field">
          <label htmlFor="explorer-to">Đến ngày</label>
          <Input id="explorer-to" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
        </div>
      </div>

      {!hasQuery ? (
        <p className="table-hint" role="status">
          Nhập mã kỳ hoặc chọn khoảng ngày để tìm.
        </p>
      ) : matches.length === 0 ? (
        <p className="table-hint" role="status">
          Không tìm thấy kỳ nào khớp truy vấn.
        </p>
      ) : (
        <>
          <p id="explorer-table-note" className="table-hint" role="status" aria-live="polite">
            Hiển thị {matches.length.toLocaleString("vi-VN")} / {totalMatches.toLocaleString("vi-VN")} kỳ khớp
            {hiddenCount > 0
              ? ` (còn ${hiddenCount.toLocaleString("vi-VN")} kỳ nữa — thu hẹp truy vấn để xem hết)`
              : ""}
            . Bảng rộng có thể cuộn ngang trên màn hình nhỏ.
          </p>
          <div className="table-wrap" tabIndex={0} aria-describedby="explorer-table-note">
            <Table>
              <TableCaption>
                Kết quả tra cứu, tối đa {DRAW_EXPLORER_RESULT_CAP} dòng mỗi lần, mới nhất trước.
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã kỳ</TableHead>
                  <TableHead>Ngày quay</TableHead>
                  <TableHead>Kết quả</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matches.map((draw) => (
                  <TableRow key={draw.id}>
                    <TableCell>#{draw.id}</TableCell>
                    <TableCell>{formatDateVi(draw.date)}</TableCell>
                    <TableCell>{draw.result.map(formatBall).join(" ")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </section>
  );
}
