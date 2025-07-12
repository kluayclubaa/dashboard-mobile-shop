export interface Branch {
  id: string
  name: string
}

export interface StockItem {
  id: string
  branchId: string
  name: string
  quantity: number
}

export interface RepairJob {
  id: string
  branchId: string
  customerName: string
  phoneModel: string
  dateReceived: string
  symptoms: string
  estimatedPrice: number
  isUnderWarranty: boolean
  technicianName: string
  expectedCompletionDate: string
  status: "in_progress" | "completed"
  images: string[] // Array of image URLs/base64 strings
  createdAt: string
}

export type Page = "main" | "branch_details" | "stock_management"
export type ModalType =
  | "add_branch"
  | "add_stock"
  | "edit_stock"
  | "delete_stock"
  | "add_repair"
  | "edit_repair"
  | "delete_repair"
  | "view_receipt"
  | null

export interface ModalState {
  type: ModalType
  data?: any
}
