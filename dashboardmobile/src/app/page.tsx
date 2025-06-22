"use client";

import React, { useState, useEffect, useMemo, FC, FormEvent } from "react";

// --- Firebase Imports ---
import { db, auth } from "@/lib/firebase"; // Ensure this path is correct for your project
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  runTransaction,
  query,
  where,
  getDocs,
  updateDoc,
  deleteDoc,
  getDoc,
  limit,
  orderBy,
  startAfter,
} from "firebase/firestore";
import {
  onAuthStateChanged,
  signOut,
  signInAnonymously,
  User,
} from "firebase/auth";

// --- UI Components / Icons ---
// It's recommended to move these to their own files, e.g., components/ui/Button.tsx
const Button: FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "outline" | "ghost" | "secondary" | "destructive";
  }
> = ({ className, variant, ...props }) => {
  const baseClasses =
    "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background";
  const variantClasses = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    destructive: "bg-red-500 text-destructive-foreground hover:bg-red-600",
    outline: "border border-input hover:bg-accent hover:text-accent-foreground",
    secondary:
      "bg-gray-200 text-secondary-foreground hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600",
    ghost: "hover:bg-accent hover:text-accent-foreground",
  };
  const selectedVariant =
    variant === "outline"
      ? variantClasses.outline
      : variant === "ghost"
      ? variantClasses.ghost
      : variant === "secondary"
      ? variantClasses.secondary
      : variant === "destructive"
      ? variantClasses.destructive
      : variantClasses.default;

  return (
    <button
      className={`${baseClasses} ${selectedVariant} ${className} px-4 py-2`}
      {...props}
    />
  );
};

const WrenchIcon: FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);
const PackageIcon: FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16.5 9.4a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" />
    <path d="M12 15.4a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5" />
    <path d="M12 22V12" />
  </svg>
);
const ArrowLeftIcon: FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </svg>
);
const EditIcon: FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />{" "}
    <path d="m15 5 4 4" />
  </svg>
);
const Trash2Icon: FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 6h18" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" x2="10" y1="11" y2="17" />
    <line x1="14" x2="14" y1="11" y2="17" />
  </svg>
);
const PlusCircleIcon: FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" x2="12" y1="8" y2="16" />
    <line x1="8" x2="16" y1="12" y2="12" />
  </svg>
);

// --- TYPE DEFINITIONS ---
interface Branch {
  id: string;
  name: string;
}
interface StockItem {
  id: string;
  branchId: string;
  name: string;
  quantity: number;
}
interface UsedItem {
  stockId: string;
  name: string;
  quantity: number;
}
interface RepairJob {
  id: string;
  branchId: string;
  description: string;
  price: number;
  itemsUsed: UsedItem[];
  createdAt: string; // ISO String
}

type Page = "main" | "branch_details" | "stock_management";
type ModalType =
  | "add_branch"
  | "add_stock"
  | "edit_stock"
  | "delete_stock"
  | "add_repair"
  | "edit_repair"
  | "delete_repair"
  | "transfer_stock"
  | null;

interface ModalState {
  type: ModalType;
  data?: any;
}

export default function IProDashboard() {
  // --- STATE MANAGEMENT ---
  const [user, setUser] = useState<User | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [repairJobs, setRepairJobs] = useState<RepairJob[]>([]);

  const [currentPage, setCurrentPage] = useState<Page>("main");
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [modal, setModal] = useState<ModalState>({ type: null });
  const [modalError, setModalError] = useState("");

  // --- AUTHENTICATION & DATA FETCHING HOOKS ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setBranches([]);
      setStock([]);
      setRepairJobs([]);
      return;
    }

    const unsubscribers = [
      onSnapshot(collection(db, "branches"), (snapshot) =>
        setBranches(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Branch))
        )
      ),
      onSnapshot(collection(db, "stock"), (snapshot) =>
        setStock(
          snapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() } as StockItem)
          )
        )
      ),
      onSnapshot(
        query(collection(db, "repairJobs"), orderBy("createdAt", "desc")),
        (snapshot) =>
          setRepairJobs(
            snapshot.docs.map(
              (doc) => ({ id: doc.id, ...doc.data() } as RepairJob)
            )
          )
      ),
    ];

    return () => unsubscribers.forEach((unsub) => unsub());
  }, [user]);

  // --- DATA DERIVATION (MEMOIZED) ---
  const {
    totalRevenue,
    totalRepairs,
    stockSummary,
    selectedBranchStock,
    selectedBranchJobs,
  } = useMemo(() => {
    const totalRevenue = repairJobs.reduce(
      (sum, job) => sum + (job.price || 0),
      0
    );
    const totalRepairs = repairJobs.length;

    const stockSummary = stock.reduce((acc, item) => {
      acc[item.name] = (acc[item.name] || 0) + item.quantity;
      return acc;
    }, {} as { [key: string]: number });

    const selectedBranchStock = stock.filter(
      (item) => item.branchId === selectedBranch?.id
    );
    const selectedBranchJobs = repairJobs.filter(
      (job) => job.branchId === selectedBranch?.id
    );

    return {
      totalRevenue,
      totalRepairs,
      stockSummary,
      selectedBranchStock,
      selectedBranchJobs,
    };
  }, [repairJobs, stock, selectedBranch]);

  // --- HANDLERS (Firebase-integrated) ---
  const handleLogin = async () => {
    // In a real app, use Firebase Auth with email/password, not a hardcoded one.
    if (password === "1234") {
      setError("");
      setLoading(true);
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Firebase Sign-In Error:", err);
        setError("การเชื่อมต่อล้มเหลว กรุณาลองใหม่");
        setLoading(false);
      }
    } else {
      setError("รหัสผ่านไม่ถูกต้อง");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentPage("main");
    setSelectedBranch(null);
  };

  const openModal = (type: ModalType, data?: any) => {
    setModal({ type, data });
    setModalError("");
  };

  const closeModal = () => {
    setModal({ type: null });
    setModalError("");
  };

  const handleAddBranch = async (branchName: string) => {
    if (branchName) {
      await addDoc(collection(db, "branches"), { name: branchName });
      closeModal();
    }
  };

  // STOCK HANDLERS
  const handleAddOrUpdateStockItem = async (
    itemName: string,
    quantity: number,
    stockIdToUpdate?: string
  ) => {
    if (!itemName || quantity <= 0 || !selectedBranch) return;

    if (stockIdToUpdate) {
      // Update existing
      await updateDoc(doc(db, "stock", stockIdToUpdate), { quantity });
    } else {
      // Add new
      await addDoc(collection(db, "stock"), {
        branchId: selectedBranch.id,
        name: itemName,
        quantity: parseInt(quantity.toString(), 10),
      });
    }
    closeModal();
  };

  const handleDeleteStockItem = async (stockId: string) => {
    if (!stockId) return;
    // Consider checking if this stock is used in any repairs before deleting.
    await deleteDoc(doc(db, "stock", stockId));
    closeModal();
  };

  // REPAIR JOB HANDLERS
  // ---------- REPAIR JOB HANDLER ----------
  const handleAddOrUpdateRepairJob = async (
    description: string,
    price: number,
    itemsUsed: UsedItem[],
    jobToUpdate?: RepairJob
  ) => {
    if (!selectedBranch || !description) {
      return setModalError("กรุณากรอกข้อมูลให้ครบถ้วน");
    }

    // --- 1. map การใช้ของเก่า & ใหม่ ---
    const oldMap = new Map<string, number>();
    jobToUpdate?.itemsUsed.forEach((i) => oldMap.set(i.stockId, i.quantity));

    const newMap = new Map<string, number>();
    itemsUsed.forEach((i) => newMap.set(i.stockId, i.quantity));

    // รวม key ทั้งสองฝั่ง
    const allIds = new Set([...oldMap.keys(), ...newMap.keys()]);

    try {
      await runTransaction(db, async (tx) => {
        // --- 2. ตรวจสต็อก & เตรียมอัปเดต ---
        const stockOps = await Promise.all(
          Array.from(allIds).map(async (id) => {
            const ref = doc(db, "stock", id);
            const snap = await tx.get(ref);
            if (!snap.exists()) throw new Error(`ไม่พบสินค้า ID: ${id}`);

            const cur = snap.data().quantity as number;
            const oldQ = oldMap.get(id) ?? 0;
            const newQ = newMap.get(id) ?? 0;
            const delta = oldQ - newQ; // + คืน, - ใช้เพิ่ม

            if (delta < 0 && cur < -delta) {
              throw new Error(`สินค้า '${snap.data().name}' ไม่เพียงพอ`);
            }
            return { ref, newQty: cur + delta };
          })
        );

        // --- 3. บันทึกงานซ่อม ---
        if (jobToUpdate) {
          tx.update(doc(db, "repairJobs", jobToUpdate.id), {
            description,
            price,
            itemsUsed,
          });
        } else {
          tx.set(doc(collection(db, "repairJobs")), {
            branchId: selectedBranch.id,
            description,
            price,
            itemsUsed,
            createdAt: new Date().toISOString(),
          });
        }

        // --- 4. อัปเดตสต็อก ---
        stockOps.forEach(({ ref, newQty }) =>
          tx.update(ref, { quantity: newQty })
        );
      });

      closeModal();
    } catch (e: any) {
      console.error("Transaction failed:", e);
      setModalError(e.message);
    }
  };

  const handleDeleteRepairJob = async (job: RepairJob) => {
    if (!job) return;
    try {
      await runTransaction(db, async (tx) => {
        // --- Add stock back ---
        const stockRestorePromises = job.itemsUsed.map(async (item) => {
          const ref = doc(db, "stock", item.stockId);
          const snap = await tx.get(ref);
          if (!snap.exists()) {
            // If stock item was deleted, we can't restore. Log it.
            console.warn(
              `Stock item ${item.name} (ID: ${item.stockId}) not found for restoration.`
            );
            return null;
          }
          return { ref, newQuantity: snap.data().quantity + item.quantity };
        });
        const stockToRestore = (await Promise.all(stockRestorePromises)).filter(
          Boolean
        );

        // --- Delete job and update stock ---
        const jobRef = doc(db, "repairJobs", job.id);
        tx.delete(jobRef);
        stockToRestore.forEach((update) => {
          if (update) tx.update(update.ref, { quantity: update.newQuantity });
        });
      });
      closeModal();
    } catch (e: any) {
      console.error("Delete transaction failed:", e);
      setModalError(e.message);
    }
  };

  // --- RENDER LOGIC ---
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <p>กำลังโหลด...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              I-PRO Dashboard
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              กรุณาใส่รหัสผ่านเพื่อเข้าสู่ระบบ
            </p>
          </div>
          <div className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleLogin()}
              placeholder="รหัสผ่าน"
              className="w-full px-4 py-2 text-gray-900 bg-gray-100 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button onClick={handleLogin} className="w-full">
              เข้าสู่ระบบ
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Main Authenticated View
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <header className="flex items-center justify-between h-16 px-6 border-b bg-white dark:bg-gray-900 dark:border-gray-800 sticky top-0 z-10">
        <h1 className="text-2xl font-bold">I-PRO Dashboard</h1>
        <Button variant="outline" onClick={handleLogout}>
          ออกจากระบบ
        </Button>
      </header>

      <main className="flex-1 p-4 md:p-6">
        {/* Main Dashboard Page */}
        {currentPage === "main" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-3xl font-semibold">ภาพรวมทั้งหมด</h2>
              <Button onClick={() => openModal("add_branch")}>
                <PlusCircleIcon className="w-5 h-5 mr-2" />
                เพิ่มสาขาใหม่
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="p-6 bg-white rounded-lg shadow dark:bg-gray-900">
                <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400">
                  รายได้รวม
                </h3>
                <p className="text-4xl font-bold">
                  ฿{totalRevenue.toLocaleString()}
                </p>
              </div>
              <div className="p-6 bg-white rounded-lg shadow dark:bg-gray-900">
                <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400">
                  จำนวนงานซ่อม
                </h3>
                <p className="text-4xl font-bold">
                  {totalRepairs.toLocaleString()}
                </p>
              </div>
              <div className="p-6 bg-white rounded-lg shadow dark:bg-gray-900 col-span-1 md:col-span-2">
                <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400">
                  สต็อกคงคลัง (ตามชื่อสินค้า)
                </h3>
                <div className="mt-2 text-sm space-y-1 overflow-y-auto max-h-24 pr-2">
                  {Object.keys(stockSummary).length > 0 ? (
                    Object.entries(stockSummary).map(([name, qty]) => (
                      <div key={name} className="flex justify-between">
                        <span>{name}</span>{" "}
                        <span>{qty.toLocaleString()} ชิ้น</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400">ไม่มีสินค้าในสต็อก</p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-2xl font-semibold mb-4">สาขาทั้งหมด</h3>
                {branches.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {branches.map((branch) => (
                      <div
                        key={branch.id}
                        onClick={() => {
                          setSelectedBranch(branch);
                          setCurrentPage("branch_details");
                        }}
                        className="p-6 bg-white rounded-lg shadow cursor-pointer hover:shadow-lg transition-shadow dark:bg-gray-900"
                      >
                        <h4 className="text-xl font-bold">{branch.name}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          คลิกเพื่อดูรายละเอียด
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                    ยังไม่มีสาขา... คลิก "เพิ่มสาขาใหม่" เพื่อเริ่มต้น
                  </p>
                )}
              </div>
              <div>
                <h3 className="text-2xl font-semibold mb-4">
                  รายการซ่อมล่าสุด
                </h3>
                <div className="bg-white rounded-lg shadow overflow-hidden dark:bg-gray-900">
                  {repairJobs.length > 0 ? (
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                      {repairJobs.slice(0, 5).map((job) => (
                        <li key={job.id} className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold">{job.description}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                สาขา:{" "}
                                {branches.find((b) => b.id === job.branchId)
                                  ?.name || "N/A"}
                              </p>
                            </div>
                            <p className="font-semibold whitespace-nowrap">
                              ฿{job.price?.toLocaleString() || 0}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-center text-gray-500 py-8">
                      ยังไม่มีรายการซ่อม
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Branch Details Page */}
        {currentPage === "branch_details" && selectedBranch && (
          <div className="space-y-6">
            <Button
              variant="ghost"
              onClick={() => setCurrentPage("main")}
              className="flex items-center gap-2"
            >
              <ArrowLeftIcon className="w-5 h-5" /> กลับไปหน้าหลัก
            </Button>
            <h2 className="text-3xl font-semibold">
              รายละเอียดสาขา: {selectedBranch.name}
            </h2>
            <div className="flex gap-4 flex-wrap">
              <Button onClick={() => openModal("add_repair")}>
                <WrenchIcon className="w-5 h-5 mr-2" /> เพิ่มรายการซ่อม
              </Button>
              <Button
                variant="secondary"
                onClick={() => setCurrentPage("stock_management")}
              >
                <PackageIcon className="w-5 h-5 mr-2" /> จัดการ Stock
              </Button>
            </div>
            <div>
              <h3 className="text-2xl font-semibold mb-4">รายการซ่อม</h3>
              <div className="bg-white rounded-lg shadow overflow-hidden dark:bg-gray-900">
                {selectedBranchJobs.length > 0 ? (
                  <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {selectedBranchJobs.map((job) => (
                      <li
                        key={job.id}
                        className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <p className="font-semibold">
                              {job.description} - ราคา:{" "}
                              {job.price?.toLocaleString() || 0} บาท
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              ใช้อุปกรณ์:{" "}
                              {job.itemsUsed
                                .map(
                                  (item) =>
                                    `${item.name} (${item.quantity} ชิ้น)`
                                )
                                .join(", ") || "ไม่มี"}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              วันที่: {new Date(job.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <Button
                              variant="ghost"
                              onClick={() => openModal("edit_repair", job)}
                            >
                              <EditIcon className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => openModal("delete_repair", job)}
                            >
                              <Trash2Icon className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-center text-gray-500 py-8">
                    ยังไม่มีรายการซ่อม
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stock Management Page */}
        {currentPage === "stock_management" && selectedBranch && (
          <div className="space-y-6">
            <Button
              variant="ghost"
              onClick={() => setCurrentPage("branch_details")}
              className="flex items-center gap-2"
            >
              <ArrowLeftIcon className="w-5 h-5" /> กลับไปหน้ารายละเอียดสาขา
            </Button>
            <h2 className="text-3xl font-semibold">
              จัดการสต็อก: {selectedBranch.name}
            </h2>
            <div className="flex gap-4 flex-wrap">
              <Button onClick={() => openModal("add_stock")}>
                <PlusCircleIcon className="w-5 h-5 mr-2" />
                เพิ่มของเข้าสต็อก
              </Button>
              {/* Transfer stock functionality can be re-added if needed */}
            </div>
            <div className="bg-white rounded-lg shadow overflow-x-auto dark:bg-gray-900">
              {selectedBranchStock.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        ชื่อสินค้า
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        จำนวนคงเหลือ
                      </th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
                    {selectedBranchStock.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap font-medium">
                          {item.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              onClick={() => openModal("edit_stock", item)}
                            >
                              <EditIcon className="w-4 h-4" /> แก้ไข
                            </Button>
                            <Button
                              variant="ghost"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => openModal("delete_stock", item)}
                            >
                              <Trash2Icon className="w-4 h-4" /> ลบ
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  ยังไม่มีของในสต็อก
                </p>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modal Container */}
      {modal.type && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md space-y-4 relative">
            <Button
              variant="ghost"
              onClick={closeModal}
              className="absolute top-2 right-2 !p-2 h-auto"
            >
              X
            </Button>

            {/* ADD/EDIT MODAL FORMS HERE */}
            <ModalContent
              modalState={modal}
              closeModal={closeModal}
              setModalError={setModalError}
              modalError={modalError}
              selectedBranch={selectedBranch}
              handleAddBranch={handleAddBranch}
              handleAddOrUpdateStockItem={handleAddOrUpdateStockItem}
              handleDeleteStockItem={handleDeleteStockItem}
              selectedBranchStock={selectedBranchStock}
              handleAddOrUpdateRepairJob={handleAddOrUpdateRepairJob}
              handleDeleteRepairJob={handleDeleteRepairJob}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// --- MODAL CONTENT COMPONENT ---
// A dedicated component to handle the complex logic inside the modal
const ModalContent: FC<{
  modalState: ModalState;
  closeModal: () => void;
  modalError: string;
  setModalError: (error: string) => void;
  selectedBranch: Branch | null;
  selectedBranchStock: StockItem[];
  handleAddBranch: (name: string) => void;
  handleAddOrUpdateStockItem: (name: string, qty: number, id?: string) => void;
  handleDeleteStockItem: (id: string) => void;
  handleAddOrUpdateRepairJob: (
    desc: string,
    price: number,
    items: UsedItem[],
    job?: RepairJob
  ) => void;
  handleDeleteRepairJob: (job: RepairJob) => void;
}> = ({
  modalState,
  closeModal,
  modalError,
  setModalError,
  selectedBranch,
  handleAddBranch,
  handleAddOrUpdateStockItem,
  handleDeleteStockItem,
  selectedBranchStock,
  handleAddOrUpdateRepairJob,
  handleDeleteRepairJob,
}) => {
  const [name, setName] = useState(modalState.data?.name || "");
  const [quantity, setQuantity] = useState(modalState.data?.quantity || 1);
  const [description, setDescription] = useState(
    modalState.data?.description || ""
  );
  const [price, setPrice] = useState(modalState.data?.price || 0);
  const [itemsUsed, setItemsUsed] = useState<UsedItem[]>(
    (modalState.data?.itemsUsed || []).map((it: any) => ({
      ...it,
      quantity: Number(it.quantity) || 0,
    }))
  );

  // เปลี่ยน handler เล็กน้อย: clamp ค่าก่อนเซต
  const handleItemUsageChange = (stockItem: StockItem, raw: number) => {
    const safeRaw = isNaN(raw) ? 0 : raw; // <- กัน NaN
    const inUse =
      itemsUsed.find((i) => i.stockId === stockItem.id)?.quantity ?? 0;
    const max = stockItem.quantity + inUse;
    const qty = Math.max(0, Math.min(safeRaw, max)); // clamp 0-max

    setItemsUsed((prev) => {
      if (qty === 0) return prev.filter((i) => i.stockId !== stockItem.id);
      const rest = prev.filter((i) => i.stockId !== stockItem.id);
      return [
        ...rest,
        { stockId: stockItem.id, name: stockItem.name, quantity: qty },
      ];
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setModalError(""); // Clear previous errors
    switch (modalState.type) {
      case "add_branch":
        handleAddBranch(name);
        break;
      case "add_stock":
        handleAddOrUpdateStockItem(name, quantity);
        break;
      case "edit_stock":
        handleAddOrUpdateStockItem(
          modalState.data.name,
          quantity,
          modalState.data.id
        );
        break;
      case "add_repair":
        handleAddOrUpdateRepairJob(description, price, itemsUsed);
        break;
      case "edit_repair":
        handleAddOrUpdateRepairJob(
          description,
          price,
          itemsUsed,
          modalState.data
        );
        break;
    }
  };

  // Render logic based on modal type
  const renderContent = () => {
    switch (modalState.type) {
      case "add_branch":
      case "add_stock":
      case "edit_stock":
        return (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-xl font-bold">
              {modalState.type === "add_branch" && "เพิ่มสาขาใหม่"}
              {modalState.type === "add_stock" && "เพิ่มของเข้าสต็อก"}
              {modalState.type === "edit_stock" &&
                `แก้ไขสต็อก: ${modalState.data.name}`}
            </h3>
            {modalState.type !== "edit_stock" && (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                type="text"
                placeholder={
                  modalState.type === "add_branch" ? "ชื่อสาขา" : "ชื่อสินค้า"
                }
                required
                className="w-full input-style"
              />
            )}
            {modalState.type !== "add_branch" && (
              <input
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                type="number"
                placeholder="จำนวน"
                min="1"
                required
                className="w-full input-style"
              />
            )}
            {modalError && <p className="text-sm text-red-500">{modalError}</p>}
            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="ghost" onClick={closeModal}>
                ยกเลิก
              </Button>
              <Button type="submit">บันทึก</Button>
            </div>
          </form>
        );

      case "delete_stock":
      case "delete_repair":
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-red-500">ยืนยันการลบ</h3>
            <p>
              คุณแน่ใจหรือไม่ว่าต้องการลบ "
              {modalState.data.name || modalState.data.description}"?
              การกระทำนี้ไม่สามารถย้อนกลับได้
            </p>
            {modalState.type === "delete_repair" && (
              <p className="text-sm text-yellow-500">
                การลบรายการซ่อมจะทำการคืนสต็อกสินค้าที่ใช้ไปกลับเข้าระบบ
              </p>
            )}
            {modalError && <p className="text-sm text-red-500">{modalError}</p>}
            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="ghost" onClick={closeModal}>
                ยกเลิก
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() =>
                  modalState.type === "delete_stock"
                    ? handleDeleteStockItem(modalState.data.id)
                    : handleDeleteRepairJob(modalState.data)
                }
              >
                ยืนยันการลบ
              </Button>
            </div>
          </div>
        );

      case "add_repair":
      case "edit_repair":
        return (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-xl font-bold">
              {modalState.type === "add_repair"
                ? "เพิ่มรายการซ่อม"
                : "แก้ไขรายการซ่อม"}
            </h3>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              type="text"
              placeholder="ซ่อมอะไร (เช่น เปลี่ยนหน้าจอ)"
              required
              className="w-full input-style"
            />
            <input
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              type="number"
              placeholder="ราคาซ่อม"
              min="0"
              required
              className="w-full input-style"
            />

            <div>
              <label className="block text-sm font-medium mb-1">
                อุปกรณ์ที่ใช้:
              </label>
              <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-2">
                {selectedBranchStock.length > 0 ? (
                  selectedBranchStock.map((item) => {
                    const itemInUse = itemsUsed.find(
                      (i) => i.stockId === item.id
                    );
                    const availableQty =
                      item.quantity + (itemInUse?.quantity || 0);
                    return (
                      <div
                        key={item.id}
                        className="grid grid-cols-3 items-center gap-2"
                      >
                        <label
                          htmlFor={`item-${item.id}`}
                          className="col-span-2 truncate"
                        >
                          {item.name} (มี {availableQty})
                        </label>
                        <input
                          id={`item-${item.id}`}
                          type="number"
                          min={0}
                          max={availableQty}
                          step={1}
                          value={itemInUse?.quantity ?? 0}
                          onChange={(e) =>
                            handleItemUsageChange(
                              item,
                              e.currentTarget.valueAsNumber
                            )
                          }
                          onBlur={(e) => {
                            if (e.currentTarget.value === "") {
                              e.currentTarget.value = "0";
                              handleItemUsageChange(item, 0);
                            }
                          }}
                          className="w-full input-style text-center"
                        />
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-400 text-sm p-2">
                    ไม่มีของในสต็อกให้เลือก
                  </p>
                )}
              </div>
            </div>

            {modalError && (
              <p className="text-sm text-red-500 bg-red-100 dark:bg-red-900/50 p-2 rounded">
                {modalError}
              </p>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="ghost" onClick={closeModal}>
                ยกเลิก
              </Button>
              <Button type="submit">บันทึก</Button>
            </div>
          </form>
        );

      default:
        return null;
    }
  };

  return renderContent();
};

// Add some global styles for convenience
const GlobalStyles = () => (
  <style jsx global>{`
    .input-style {
      display: block;
      width: 100%;
      padding: 0.5rem 0.75rem;
      font-size: 1rem;
      color: #111827;
      background-color: #f9fafb;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
    }
    .dark .input-style {
      color: #f9fafb;
      background-color: #1f2937;
      border-color: #4b5563;
    }
    .input-style:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
    }
  `}</style>
);

IProDashboard.displayName = "IProDashboard";
