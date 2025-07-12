"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText } from "lucide-react"
import type { RepairJob, Branch } from "@/types"

interface RepairReceiptProps {
  job: RepairJob
  branch: Branch
}

export default function RepairReceipt({ job, branch }: RepairReceiptProps) {
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-4">
      <div className="text-center border-b pb-4">
        <h3 className="text-lg font-bold">ใบแจ้งซ่อมออนไลน์</h3>
        <p className="text-sm text-muted-foreground">{branch.name}</p>
      </div>

      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="font-medium">ชื่อลูกค้า:</span>
          </div>
          <div>{job.customerName}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="font-medium">รุ่นมือถือ:</span>
          </div>
          <div>{job.phoneModel}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="font-medium">วันที่รับแจ้ง:</span>
          </div>
          <div>{new Date(job.dateReceived).toLocaleDateString("th-TH")}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="font-medium">อาการ:</span>
          </div>
          <div>{job.symptoms}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="font-medium">ราคา:</span>
          </div>
          <div>฿{job.estimatedPrice.toLocaleString()}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="font-medium">ประกัน:</span>
          </div>
          <div>{job.isUnderWarranty ? "อยู่ในประกัน" : "ไม่อยู่ในประกัน"}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="font-medium">ช่างซ่อม:</span>
          </div>
          <div>{job.technicianName}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="font-medium">วันคาดเสร็จ:</span>
          </div>
          <div>{new Date(job.expectedCompletionDate).toLocaleDateString("th-TH")}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="font-medium">สถานะ:</span>
          </div>
          <div>
            <Badge variant={job.status === "completed" ? "default" : "outline"}>
              {job.status === "completed" ? "เสร็จสิ้น" : "กำลังดำเนินการ"}
            </Badge>
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-muted-foreground border-t pt-4">
        <p>ขอบคุณที่ใช้บริการ</p>
        <p>พิมพ์เมื่อ: {new Date().toLocaleString("th-TH")}</p>
      </div>

      <div className="flex justify-end">
        <Button onClick={handlePrint} size="sm">
          <FileText className="w-4 h-4 mr-2" />
          พิมพ์ใบแจ้งซ่อม
        </Button>
      </div>
    </div>
  )
}
