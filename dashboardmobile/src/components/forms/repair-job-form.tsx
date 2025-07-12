"use client"

import { useState, type FormEvent, type ChangeEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertCircle,
  User,
  Smartphone,
  Calendar,
  FileText,
  DollarSign,
  Shield,
  Wrench,
  Clock,
  Activity,
  Camera,
  X,
  Upload,
} from "lucide-react"
import type { RepairJob } from "@/types"

interface RepairJobFormProps {
  onSubmit: (repairData: Omit<RepairJob, "id" | "branchId" | "createdAt">, job?: RepairJob) => void
  onClose: () => void
  error?: string
  initialData?: RepairJob
}

export default function RepairJobForm({ onSubmit, onClose, error, initialData }: RepairJobFormProps) {
  const [customerName, setCustomerName] = useState(initialData?.customerName || "")
  const [phoneModel, setPhoneModel] = useState(initialData?.phoneModel || "")
  const [dateReceived, setDateReceived] = useState(initialData?.dateReceived || new Date().toISOString().split("T")[0])
  const [symptoms, setSymptoms] = useState(initialData?.symptoms || "")
  const [estimatedPrice, setEstimatedPrice] = useState(initialData?.estimatedPrice || 0)
  const [isUnderWarranty, setIsUnderWarranty] = useState(initialData?.isUnderWarranty || false)
  const [technicianName, setTechnicianName] = useState(initialData?.technicianName || "")
  const [expectedCompletionDate, setExpectedCompletionDate] = useState(
    initialData?.expectedCompletionDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  )
  const [status, setStatus] = useState<"in_progress" | "completed">(initialData?.status || "in_progress")
  const [images, setImages] = useState<string[]>(initialData?.images || [])
  const [uploading, setUploading] = useState(false)

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    setUploading(true)
    const newImages: string[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file.type.startsWith("image/")) {
        const reader = new FileReader()
        reader.onload = (event) => {
          if (event.target?.result) {
            newImages.push(event.target.result as string)
            if (newImages.length === files.length) {
              setImages((prev) => [...prev, ...newImages])
              setUploading(false)
            }
          }
        }
        reader.readAsDataURL(file)
      }
    }
  }

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (customerName.trim() && phoneModel.trim() && symptoms.trim() && technicianName.trim()) {
      onSubmit(
        {
          customerName: customerName.trim(),
          phoneModel: phoneModel.trim(),
          dateReceived,
          symptoms: symptoms.trim(),
          estimatedPrice,
          isUnderWarranty,
          technicianName: technicianName.trim(),
          expectedCompletionDate,
          status,
          images,
        },
        initialData,
      )
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Customer Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <User className="w-5 h-5 text-blue-600" />
          ข้อมูลลูกค้า
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="customer-name" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              ชื่อลูกค้า *
            </Label>
            <Input
              id="customer-name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="กรอกชื่อลูกค้า"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone-model" className="flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              รุ่นมือถือ *
            </Label>
            <Input
              id="phone-model"
              value={phoneModel}
              onChange={(e) => setPhoneModel(e.target.value)}
              placeholder="เช่น iPhone 14 Pro, Samsung Galaxy S23"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date-received" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              วันที่รับแจ้ง *
            </Label>
            <Input
              id="date-received"
              type="date"
              value={dateReceived}
              onChange={(e) => setDateReceived(e.target.value)}
              required
            />
          </div>
        </div>
      </div>

      {/* Repair Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Wrench className="w-5 h-5 text-orange-600" />
          รายละเอียดการซ่อม
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="expected-completion" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              วันคาดการเสร็จ *
            </Label>
            <Input
              id="expected-completion"
              type="date"
              value={expectedCompletionDate}
              onChange={(e) => setExpectedCompletionDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="repair-status" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              สถานะการซ่อม
            </Label>
            <Select value={status} onValueChange={(value: "in_progress" | "completed") => setStatus(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in_progress">กำลังดำเนินการ</SelectItem>
                <SelectItem value="completed">เสร็จสิ้น</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="symptoms" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            อาการ/ปัญหา *
          </Label>
          <Textarea
            id="symptoms"
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder="อธิบายอาการหรือปัญหาที่พบ"
            rows={2}
            required
          />
        </div>

        {/* Image Upload */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Camera className="w-4 h-4" />
            รูปภาพประกอบ
          </Label>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                disabled={uploading}
                className="hidden"
                id="image-upload"
              />
              <Label
                htmlFor="image-upload"
                className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <Upload className="w-4 h-4" />
                {uploading ? "กำลังอัพโหลด..." : "เลือกรูปภาพ"}
              </Label>
              <span className="text-sm text-muted-foreground">(สามารถเลือกได้หลายรูป)</span>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {images.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={image || "/placeholder.svg"}
                      alt={`รูปที่ ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-1 right-1 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeImage(index)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pricing & Warranty */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-600" />
          ราคาและประกัน
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="estimated-price" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              ราคาประเมิน (บาท) *
            </Label>
            <Input
              id="estimated-price"
              type="number"
              value={estimatedPrice}
              onChange={(e) => setEstimatedPrice(Number(e.target.value))}
              placeholder="0"
              min="0"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="warranty-status" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              สถานะประกัน
            </Label>
            <Select
              value={isUnderWarranty ? "yes" : "no"}
              onValueChange={(value) => setIsUnderWarranty(value === "yes")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no">ไม่อยู่ในประกัน</SelectItem>
                <SelectItem value="yes">อยู่ในประกัน</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="technician-name" className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              ชื่อช่างซ่อม *
            </Label>
            <Input
              id="technician-name"
              value={technicianName}
              onChange={(e) => setTechnicianName(e.target.value)}
              placeholder="กรอกชื่อช่างซ่อม"
              required
            />
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onClose}>
          ยกเลิก
        </Button>
        <Button type="submit" disabled={uploading}>
          <Wrench className="w-4 h-4 mr-2" />
          บันทึก
        </Button>
      </div>
    </form>
  )
}
