"use client"

import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { StockItem } from "@/types"
import { Package, Hash } from "lucide-react"

interface StockFormProps {
  onSubmit: (name: string, quantity: number, id?: string) => void
  onClose: () => void
  initialData?: StockItem
}

export default function StockForm({ onSubmit, onClose, initialData }: StockFormProps) {
  const [name, setName] = useState(initialData?.name || "")
  const [quantity, setQuantity] = useState(initialData?.quantity || 1)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (name.trim() && quantity > 0) {
      onSubmit(name.trim(), quantity, initialData?.id)
      if (!initialData) {
        setName("")
        setQuantity(1)
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!initialData && (
        <div className="space-y-2">
          <Label htmlFor="stock-name" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            ชื่อสินค้า
          </Label>
          <Input
            id="stock-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="กรอกชื่อสินค้า"
            required
          />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="stock-quantity" className="flex items-center gap-2">
          <Hash className="w-4 h-4" />
          จำนวน
        </Label>
        <Input
          id="stock-quantity"
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          placeholder="กรอกจำนวน"
          min="1"
          required
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          ยกเลิก
        </Button>
        <Button type="submit">บันทึก</Button>
      </div>
    </form>
  )
}
