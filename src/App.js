import React, { useState, useMemo, useEffect } from "react";
import {
  PlusCircle,
  Wallet,
  TrendingDown,
  TrendingUp,
  Calendar,
  Tag,
  FileText,
  Trash2,
  Settings,
  Filter,
  X,
  Target,
  Repeat,
  AlertTriangle,
  Clock,
  CalendarDays,
  Edit,
  Menu,
  ChevronDown,
  Sun,
  Moon,
  LogOut,
  Lock,
  User,
} from "lucide-react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";

// إعدادات فايربيس الخاصة بك
const firebaseConfig = {
  apiKey: "AIzaSyDBn__Uv8y4rI9vSyMq0BtHxVHoMRoZRwg",
  authDomain: "naddaf-fin.firebaseapp.com",
  projectId: "naddaf-fin",
  storageBucket: "naddaf-fin.firebasestorage.app",
  messagingSenderId: "968355948852",
  appId: "1:968355948852:web:d3112634319db00d899d61",
  measurementId: "G-JG862B3X45",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const APP_ID = "budget-tracker";

const App = () => {
  const months = [
    "يناير",
    "فبراير",
    "مارس",
    "أبريل",
    "مايو",
    "يونيو",
    "يوليو",
    "أغسطس",
    "سبتمبر",
    "أكتوبر",
    "نوفمبر",
    "ديسمبر",
  ];
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const availableYears = Array.from(
    { length: 10 },
    (_, i) => currentYear - 3 + i
  );

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // حالات شاشة الدخول باسم المستخدم
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const isDark = true; // تثبيت الوضع الليلي دائماً

  const [categories, setCategories] = useState({
    income: ["راتب", "تجارة", "أخرى"],
    expense: ["التزامات", "أقساط", "مصروفات يومية"],
  });
  const [transactions, setTransactions] = useState([]);
  const [fixedTransactions, setFixedTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // دالة الدخول الذكية (تحول اسم المستخدم لإيميل وهمي بالخلفية)
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError("");
    setLoading(true);
    try {
      const formattedEmail = `${username.trim().toLowerCase()}@gmail.com`;
      await signInWithEmailAndPassword(auth, formattedEmail, password);
    } catch (err) {
      console.error(err);
      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-email"
      ) {
        setAuthError("اسم المستخدم أو كلمة المرور غير صحيحة، يرجى التأكد.");
      } else {
        setAuthError("حدث خطأ في النظام، تواصل مع الدعم الفني.");
      }
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const unsubs = [];

    const catRef = doc(
      db,
      "artifacts",
      APP_ID,
      "users",
      user.uid,
      "settings",
      "categories"
    );
    unsubs.push(
      onSnapshot(catRef, (docSnap) => {
        if (docSnap.exists()) setCategories(docSnap.data());
        else
          setDoc(catRef, {
            income: ["راتب", "تجارة", "أخرى"],
            expense: ["التزامات", "أقساط", "مصروفات يومية"],
          }).catch((err) => console.error(err));
      })
    );

    const txRef = collection(
      db,
      "artifacts",
      APP_ID,
      "users",
      user.uid,
      "transactions"
    );
    unsubs.push(
      onSnapshot(txRef, (snap) => {
        const txs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        txs.sort((a, b) => Number(b.id) - Number(a.id));
        setTransactions(txs);
      })
    );

    const fixedRef = collection(
      db,
      "artifacts",
      APP_ID,
      "users",
      user.uid,
      "fixedTransactions"
    );
    unsubs.push(
      onSnapshot(fixedRef, (snap) => {
        setFixedTransactions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      })
    );

    const goalsRef = collection(
      db,
      "artifacts",
      APP_ID,
      "users",
      user.uid,
      "goals"
    );
    unsubs.push(
      onSnapshot(goalsRef, (snap) => {
        setGoals(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      })
    );

    return () => unsubs.forEach((fn) => fn());
  }, [user]);

  const [type, setType] = useState("مصروف");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const [editingTxId, setEditingTxId] = useState(null);

  useEffect(() => {
    if (!category && categories.expense.length > 0) {
      setCategory(
        type === "إيراد"
          ? categories.income[0] || ""
          : categories.expense[0] || ""
      );
    }
  }, [categories, type, category]);

  const [fixedType, setFixedType] = useState("مصروف");
  const [fixedSubType, setFixedSubType] = useState("مستمر");
  const [fixedAmount, setFixedAmount] = useState("");
  const [fixedTargetAmount, setFixedTargetAmount] = useState("");
  const [fixedCategory, setFixedCategory] = useState("");
  const [fixedStartMonth, setFixedStartMonth] = useState(currentMonth);
  const [fixedStartYear, setFixedStartYear] = useState(currentYear);
  const [fixedEndMonth, setFixedEndMonth] = useState(11);
  const [fixedEndYear, setFixedEndYear] = useState(currentYear);
  const [fixedNote, setFixedNote] = useState("");
  const [editingFixedId, setEditingFixedId] = useState(null);

  useEffect(() => {
    if (!fixedCategory && categories.expense.length > 0) {
      setFixedCategory(
        fixedType === "إيراد"
          ? categories.income[0] || ""
          : categories.expense[0] || ""
      );
    }
  }, [categories, fixedType, fixedCategory]);

  const [goalName, setGoalName] = useState("");
  const [goalAmount, setGoalAmount] = useState("");
  const [goalStartMonth, setGoalStartMonth] = useState(currentMonth);
  const [goalStartYear, setGoalStartYear] = useState(currentYear);
  const [goalEndMonth, setGoalEndMonth] = useState(11);
  const [goalEndYear, setGoalEndYear] = useState(currentYear);
  const [goalForce, setGoalForce] = useState(false);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryType, setNewCategoryType] = useState("مصروف");

  const [showSettings, setShowSettings] = useState(false);
  const [showFixedSettings, setShowFixedSettings] = useState(false);
  const [showGoalSettings, setShowGoalSettings] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showTableFilter, setShowTableFilter] = useState(false);

  const [filterMonth, setFilterMonth] = useState("الكل");
  const [filterSelectedCategories, setFilterSelectedCategories] = useState([]);

  const formatDisplayDate = (dateString) => {
    if (!dateString) return "";
    const parts = dateString.split("-");
    if (parts.length !== 3) return dateString;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };
  const isAfterOrEqual = (y1, m1, y2, m2) => y1 > y2 || (y1 === y2 && m1 >= m2);
  const isBeforeOrEqual = (y1, m1, y2, m2) =>
    y1 < y2 || (y1 === y2 && m1 <= m2);
  const isBetween = (y, m, sy, sm, ey, em) =>
    isAfterOrEqual(y, m, sy, sm) && isBeforeOrEqual(y, m, ey, em);

  const handleTypeChange = (newType) => {
    setType(newType);
    setCategory(
      newType === "إيراد"
        ? categories.income[0] || ""
        : categories.expense[0] || ""
    );
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0 || !category)
      return;
    if (!user) return;
    const d = new Date(date);
    const newTransaction = {
      type,
      amount: Number(amount),
      category,
      date,
      year: d.getFullYear(),
      month: d.getMonth(),
      note,
    };

    try {
      if (editingTxId) {
        await setDoc(
          doc(
            db,
            "artifacts",
            APP_ID,
            "users",
            user.uid,
            "transactions",
            editingTxId.toString()
          ),
          newTransaction
        );
        setEditingTxId(null);
      } else {
        const newId = Date.now().toString();
        await setDoc(
          doc(
            db,
            "artifacts",
            APP_ID,
            "users",
            user.uid,
            "transactions",
            newId
          ),
          newTransaction
        );
      }
      setAmount("");
      setNote("");
      setErrorMsg("");
    } catch (err) {
      console.error(err);
      setErrorMsg("فشل الحفظ: تأكد من اتصالك بالإنترنت.");
    }
  };

  const handleEditTransaction = (t) => {
    setEditingTxId(t.id);
    setType(t.type);
    setAmount(t.amount.toString());
    setCategory(t.category);
    setDate(t.date);
    setNote(t.note || "");
  };

  const cancelEditTx = () => {
    setEditingTxId(null);
    setAmount("");
    setNote("");
  };

  const deleteTransaction = async (id) => {
    if (!user) return;
    try {
      await deleteDoc(
        doc(
          db,
          "artifacts",
          APP_ID,
          "users",
          user.uid,
          "transactions",
          id.toString()
        )
      );
    } catch (err) {}
  };

  const handleFixedTypeChange = (newType) => {
    setFixedType(newType);
    setFixedCategory(
      newType === "إيراد"
        ? categories.income[0] || ""
        : categories.expense[0] || ""
    );
    if (newType === "إيراد" && fixedSubType === "استحقاق")
      setFixedSubType("مستمر");
  };

  const handleAddFixedTransaction = async (e) => {
    e.preventDefault();
    if (!fixedCategory) return;
    if (!user) return;

    let newFixed = {
      type: fixedType,
      category: fixedCategory,
      note: fixedNote,
      subType: fixedSubType,
      startMonth: Number(fixedStartMonth),
      startYear: Number(fixedStartYear),
    };

    if (fixedSubType === "استحقاق") {
      if (
        !fixedTargetAmount ||
        isNaN(Number(fixedTargetAmount)) ||
        Number(fixedTargetAmount) <= 0
      )
        return;
      newFixed.targetAmount = Number(fixedTargetAmount);
      newFixed.endMonth = Number(fixedEndMonth);
      newFixed.endYear = Number(fixedEndYear);
    } else if (fixedSubType === "مؤقت") {
      if (
        !fixedAmount ||
        isNaN(Number(fixedAmount)) ||
        Number(fixedAmount) <= 0
      )
        return;
      newFixed.amount = Number(fixedAmount);
      newFixed.endMonth = Number(fixedEndMonth);
      newFixed.endYear = Number(fixedEndYear);
    } else {
      if (
        !fixedAmount ||
        isNaN(Number(fixedAmount)) ||
        Number(fixedAmount) <= 0
      )
        return;
      newFixed.amount = Number(fixedAmount);
    }

    try {
      if (editingFixedId) {
        await setDoc(
          doc(
            db,
            "artifacts",
            APP_ID,
            "users",
            user.uid,
            "fixedTransactions",
            editingFixedId.toString()
          ),
          newFixed
        );
        setEditingFixedId(null);
      } else {
        const newId = Date.now().toString();
        await setDoc(
          doc(
            db,
            "artifacts",
            APP_ID,
            "users",
            user.uid,
            "fixedTransactions",
            newId
          ),
          newFixed
        );
      }
      setFixedAmount("");
      setFixedTargetAmount("");
      setFixedNote("");
      setErrorMsg("");
    } catch (err) {
      setErrorMsg("فشل الحفظ.");
    }
  };

  const handleEditFixedTransaction = (t) => {
    setEditingFixedId(t.id);
    setFixedType(t.type);
    setFixedSubType(t.subType);
    setFixedCategory(t.category);
    setFixedNote(t.note || "");
    setFixedStartMonth(t.startMonth);
    setFixedStartYear(t.startYear);
    if (t.subType === "استحقاق") {
      setFixedTargetAmount(t.targetAmount || "");
      setFixedEndMonth(t.endMonth);
      setFixedEndYear(t.endYear);
      setFixedAmount("");
    } else if (t.subType === "مؤقت") {
      setFixedAmount(t.amount || "");
      setFixedEndMonth(t.endMonth);
      setFixedEndYear(t.endYear);
      setFixedTargetAmount("");
    } else {
      setFixedAmount(t.amount || "");
      setFixedTargetAmount("");
    }
  };

  const cancelEditFixed = () => {
    setEditingFixedId(null);
    setFixedAmount("");
    setFixedTargetAmount("");
    setFixedNote("");
  };

  const deleteFixedTransaction = async (id) => {
    if (!user) return;
    try {
      await deleteDoc(
        doc(
          db,
          "artifacts",
          APP_ID,
          "users",
          user.uid,
          "fixedTransactions",
          id.toString()
        )
      );
    } catch (err) {}
  };

  const handleAddGoal = async (e) => {
    e.preventDefault();
    if (
      !goalName ||
      !goalAmount ||
      isNaN(Number(goalAmount)) ||
      Number(goalAmount) <= 0
    )
      return;
    if (!user) return;
    const newId = Date.now().toString();
    const newGoal = {
      name: goalName,
      targetAmount: Number(goalAmount),
      startMonth: Number(goalStartMonth),
      startYear: Number(goalStartYear),
      targetMonth: Number(goalEndMonth),
      targetYear: Number(goalEndYear),
      forceTarget: goalForce,
      active: true,
    };
    try {
      await setDoc(
        doc(db, "artifacts", APP_ID, "users", user.uid, "goals", newId),
        newGoal
      );
      setGoalName("");
      setGoalAmount("");
      setGoalForce(false);
      setErrorMsg("");
    } catch (err) {}
  };

  const deleteGoal = async (id) => {
    if (!user) return;
    try {
      await deleteDoc(
        doc(db, "artifacts", APP_ID, "users", user.uid, "goals", id.toString())
      );
    } catch (err) {}
  };

  const toggleGoalActive = async (id) => {
    if (!user) return;
    const targetGoal = goals.find((g) => g.id === id);
    if (targetGoal) {
      try {
        await setDoc(
          doc(
            db,
            "artifacts",
            APP_ID,
            "users",
            user.uid,
            "goals",
            id.toString()
          ),
          { ...targetGoal, active: !targetGoal.active }
        );
      } catch (err) {}
    }
  };

  const addCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    if (!user) return;
    const key = newCategoryType === "إيراد" ? "income" : "expense";
    if (!categories[key].includes(newCategoryName.trim())) {
      const updatedCategories = {
        ...categories,
        [key]: [...categories[key], newCategoryName.trim()],
      };
      try {
        await setDoc(
          doc(
            db,
            "artifacts",
            APP_ID,
            "users",
            user.uid,
            "settings",
            "categories"
          ),
          updatedCategories
        );
        if (!category) setCategory(newCategoryName.trim());
        if (!fixedCategory) setFixedCategory(newCategoryName.trim());
        setNewCategoryName("");
        setErrorMsg("");
      } catch (err) {}
    }
  };

  const deleteCategory = async (typeToDelete, nameToDelete) => {
    if (!user) return;
    const key = typeToDelete === "إيراد" ? "income" : "expense";
    const updatedCategories = {
      ...categories,
      [key]: categories[key].filter((c) => c !== nameToDelete),
    };

    try {
      await setDoc(
        doc(
          db,
          "artifacts",
          APP_ID,
          "users",
          user.uid,
          "settings",
          "categories"
        ),
        updatedCategories
      );
      transactions.forEach(async (t) => {
        if (t.type === typeToDelete && t.category === nameToDelete)
          await deleteDoc(
            doc(
              db,
              "artifacts",
              APP_ID,
              "users",
              user.uid,
              "transactions",
              t.id.toString()
            )
          );
      });
      fixedTransactions.forEach(async (t) => {
        if (t.type === typeToDelete && t.category === nameToDelete)
          await deleteDoc(
            doc(
              db,
              "artifacts",
              APP_ID,
              "users",
              user.uid,
              "fixedTransactions",
              t.id.toString()
            )
          );
      });
      if (category === nameToDelete)
        setCategory(updatedCategories[key][0] || "");
      if (fixedCategory === nameToDelete)
        setFixedCategory(updatedCategories[key][0] || "");
      setFilterSelectedCategories(
        filterSelectedCategories.filter((c) => c !== nameToDelete)
      );
    } catch (err) {}
  };

  const toggleFilterCategory = (catName) => {
    if (filterSelectedCategories.includes(catName))
      setFilterSelectedCategories(
        filterSelectedCategories.filter((c) => c !== catName)
      );
    else setFilterSelectedCategories([...filterSelectedCategories, catName]);
  };

  const closeAllSettingsMenus = () => {
    setShowSettings(false);
    setShowFixedSettings(false);
    setShowGoalSettings(false);
    setIsMobileMenuOpen(false);
  };

  const handleMenuClick = (menu) => {
    closeAllSettingsMenus();
    if (menu === "settings") setShowSettings(true);
    if (menu === "fixed") setShowFixedSettings(true);
    if (menu === "goals") setShowGoalSettings(true);
  };

  const summary = useMemo(() => {
    let minYear = selectedYear;
    transactions.forEach((t) => {
      if (t.year < minYear) minYear = t.year;
    });
    fixedTransactions.forEach((ft) => {
      if (ft.startYear < minYear) minYear = ft.startYear;
    });
    goals.forEach((g) => {
      if (g.active && g.startYear < minYear) minYear = g.startYear;
    });

    let totalIncome = 0;
    let totalExpense = 0;
    let totalSaved = 0;
    let totalDueDatesFunded = 0;

    const monthlyData = months.map((month) => ({
      monthName: month,
      income: 0,
      expense: 0,
      dueDatesAmount: 0,
      savings: 0,
      finalNet: 0,
      expenseDetails: categories.expense.reduce(
        (acc, cat) => ({ ...acc, [cat]: 0 }),
        {}
      ),
    }));

    let remainingDueDates = {};
    fixedTransactions.forEach((ft) => {
      if (ft.subType === "استحقاق") remainingDueDates[ft.id] = ft.targetAmount;
    });
    let remainingGoals = {};
    goals.forEach((g) => {
      if (g.active) remainingGoals[g.id] = g.targetAmount;
    });
    let isGoalIllogical = false;

    let maxTargetYear = selectedYear;
    goals.forEach((g) => {
      if (g.active && g.targetYear > maxTargetYear)
        maxTargetYear = g.targetYear;
    });
    const simulateUpTo = Math.max(selectedYear, maxTargetYear);

    for (let y = minYear; y <= simulateUpTo; y++) {
      for (let m = 0; m < 12; m++) {
        let mIncome = 0;
        let mExpense = 0;
        let mExpenseDetails = {};

        transactions
          .filter((t) => t.year === y && t.month === m)
          .forEach((t) => {
            if (t.type === "إيراد") mIncome += t.amount;
            else {
              mExpense += t.amount;
              mExpenseDetails[t.category] =
                (mExpenseDetails[t.category] || 0) + t.amount;
            }
          });

        fixedTransactions.forEach((ft) => {
          if (
            ft.subType === "مستمر" &&
            isAfterOrEqual(y, m, ft.startYear, ft.startMonth)
          ) {
            if (ft.type === "إيراد") mIncome += ft.amount;
            else {
              mExpense += ft.amount;
              mExpenseDetails[ft.category] =
                (mExpenseDetails[ft.category] || 0) + ft.amount;
            }
          } else if (
            ft.subType === "مؤقت" &&
            isBetween(
              y,
              m,
              ft.startYear,
              ft.startMonth,
              ft.endYear,
              ft.endMonth
            )
          ) {
            if (ft.type === "إيراد") mIncome += ft.amount;
            else {
              mExpense += ft.amount;
              mExpenseDetails[ft.category] =
                (mExpenseDetails[ft.category] || 0) + ft.amount;
            }
          }
        });

        let baseNet = mIncome - mExpense;
        let requiredDueDatesTotal = 0;
        let requiredDueMap = {};
        fixedTransactions.forEach((ft) => {
          if (
            ft.subType === "استحقاق" &&
            isBetween(
              y,
              m,
              ft.startYear,
              ft.startMonth,
              ft.endYear,
              ft.endMonth
            ) &&
            remainingDueDates[ft.id] > 0
          ) {
            let monthsLeft = (ft.endYear - y) * 12 + ft.endMonth - m + 1;
            let req = remainingDueDates[ft.id] / monthsLeft;
            requiredDueMap[ft.id] = req;
            requiredDueDatesTotal += req;
          }
        });

        let requiredGoalsTotal = 0;
        let requiredGoalMap = {};
        goals.forEach((g) => {
          if (
            g.active &&
            isBetween(
              y,
              m,
              g.startYear,
              g.startMonth,
              g.targetYear,
              g.targetMonth
            ) &&
            remainingGoals[g.id] > 0
          ) {
            let monthsLeft = (g.targetYear - y) * 12 + g.targetMonth - m + 1;
            let req = remainingGoals[g.id] / monthsLeft;
            requiredGoalMap[g.id] = req;
            requiredGoalsTotal += req;
          }
        });

        let available = baseNet;
        let actualDueDatesFunded = 0;
        let actualGoalFunded = 0;

        let hasForceGoal = goals.some(
          (g) =>
            g.active &&
            g.forceTarget &&
            isBetween(
              y,
              m,
              g.startYear,
              g.startMonth,
              g.targetYear,
              g.targetMonth
            )
        );

        if (hasForceGoal) {
          actualDueDatesFunded = requiredDueDatesTotal;
          actualGoalFunded = requiredGoalsTotal;
        } else {
          if (available > 0) {
            if (available >= requiredDueDatesTotal) {
              actualDueDatesFunded = requiredDueDatesTotal;
              available -= requiredDueDatesTotal;
            } else {
              actualDueDatesFunded = available;
              available = 0;
            }
          }
          if (available > 0) {
            if (available >= requiredGoalsTotal) {
              actualGoalFunded = requiredGoalsTotal;
              available -= requiredGoalsTotal;
            } else {
              actualGoalFunded = available;
              available = 0;
            }
          }
        }

        if (actualDueDatesFunded > 0) {
          let ratio =
            requiredDueDatesTotal > 0
              ? actualDueDatesFunded / requiredDueDatesTotal
              : 0;
          fixedTransactions.forEach((ft) => {
            if (ft.subType === "استحقاق" && requiredDueMap[ft.id]) {
              let funded = requiredDueMap[ft.id] * ratio;
              remainingDueDates[ft.id] -= funded;
              mExpense += funded;
              mExpenseDetails[ft.category] =
                (mExpenseDetails[ft.category] || 0) + funded;
            }
          });
        }

        if (actualGoalFunded > 0) {
          let ratio =
            requiredGoalsTotal > 0 ? actualGoalFunded / requiredGoalsTotal : 0;
          goals.forEach((g) => {
            if (g.active && requiredGoalMap[g.id]) {
              remainingGoals[g.id] -= requiredGoalMap[g.id] * ratio;
            }
          });
        }

        let finalNet = mIncome - mExpense - actualGoalFunded;

        if (y === selectedYear) {
          monthlyData[m].income = mIncome;
          monthlyData[m].expense = mExpense;
          monthlyData[m].dueDatesAmount = actualDueDatesFunded;
          monthlyData[m].savings = actualGoalFunded;
          monthlyData[m].finalNet = finalNet;
          Object.keys(mExpenseDetails).forEach((cat) => {
            if (monthlyData[m].expenseDetails[cat] !== undefined)
              monthlyData[m].expenseDetails[cat] += mExpenseDetails[cat];
          });
          totalIncome += mIncome;
          totalExpense += mExpense;
          totalSaved += actualGoalFunded;
          totalDueDatesFunded += actualDueDatesFunded;
        }
      }
    }
    if (Object.values(remainingGoals).some((val) => val > 0.1))
      isGoalIllogical = true;
    return {
      totalIncome,
      totalExpense,
      totalSaved,
      totalDueDatesFunded,
      net: totalIncome - totalExpense - totalSaved,
      monthlyData,
      isGoalIllogical,
    };
  }, [
    transactions,
    fixedTransactions,
    categories.expense,
    goals,
    selectedYear,
  ]);

  const displayedMonthsData = useMemo(() => {
    let dataToDisplay = summary.monthlyData;
    if (filterMonth !== "الكل")
      dataToDisplay = dataToDisplay.filter((m) => m.monthName === filterMonth);
    return dataToDisplay;
  }, [summary.monthlyData, filterMonth]);

  const displayedExpenseCategories = useMemo(() => {
    if (filterSelectedCategories.length === 0) return categories.expense;
    return categories.expense.filter((cat) =>
      filterSelectedCategories.includes(cat)
    );
  }, [categories.expense, filterSelectedCategories]);

  // شاشة التحميل
  if (loading) {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center ${
          isDark ? "bg-slate-900 text-white" : "bg-slate-50 text-indigo-900"
        } transition-colors`}
        dir="rtl"
      >
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-bold text-lg">بسم الله... جاري التحميل ☁️</p>
      </div>
    );
  }

  // شاشة تسجيل الدخول باسم المستخدم (محمية ومغلقة للتسجيل)
  if (!user) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center p-4 ${
          isDark ? "bg-slate-900" : "bg-slate-50"
        } transition-colors`}
        dir="rtl"
      >
        <div
          className={`w-full max-w-md p-8 rounded-2xl shadow-xl border ${
            isDark
              ? "bg-slate-800 border-slate-700"
              : "bg-white border-slate-100"
          }`}
        >
          <div className="text-center mb-8">
            <h1
              className={`text-3xl font-bold ${
                isDark ? "text-indigo-400" : "text-indigo-900"
              }`}
            >
              نظام الميزانية المتطور
            </h1>
            <p
              className={`mt-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}
            >
              بوابة المشتركين - الرجاء تسجيل الدخول
            </p>
          </div>

          {authError && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm font-bold flex items-center mb-6 border border-red-200 dark:border-red-800">
              <AlertTriangle size={18} className="ml-2 shrink-0" />
              {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label
                className={`block text-sm font-medium mb-1 ${
                  isDark ? "text-slate-300" : "text-slate-700"
                }`}
              >
                اسم المستخدم
              </label>
              <div className="relative">
                <User
                  size={18}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${
                    isDark ? "text-slate-500" : "text-slate-400"
                  }`}
                />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className={`w-full pr-10 pl-4 py-3 rounded-xl border outline-none transition-all ${
                    isDark
                      ? "bg-slate-700 border-slate-600 text-white focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                      : "bg-slate-50 border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  }`}
                  placeholder="أدخل اسم المستخدم الخاص بك"
                />
              </div>
            </div>
            <div>
              <label
                className={`block text-sm font-medium mb-1 ${
                  isDark ? "text-slate-300" : "text-slate-700"
                }`}
              >
                كلمة المرور
              </label>
              <div className="relative">
                <Lock
                  size={18}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${
                    isDark ? "text-slate-500" : "text-slate-400"
                  }`}
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className={`w-full pr-10 pl-4 py-3 rounded-xl border outline-none transition-all ${
                    isDark
                      ? "bg-slate-700 border-slate-600 text-white focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                      : "bg-slate-50 border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  }`}
                  placeholder="••••••"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors mt-4"
            >
              دخول
            </button>
          </form>

          <div className="mt-6 text-center flex flex-col items-center">
            <p className="text-xs text-slate-400 mb-2">
              هذا النظام مخصص للمشتركين فقط.
            </p>
            <a
              href="https://your-store-link.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-bold text-indigo-400 hover:text-indigo-300 underline transition-colors"
            >
              للحصول على حساب اضغط هنا واشتري حسابك الآن
            </a>
          </div>
        </div>
      </div>
    );
  }

  // --- الواجهة الرئيسية للتطبيق ---
  return (
    <div className={isDark ? "dark" : ""}>
      <div
        className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-3 md:p-8 font-sans transition-colors duration-300"
        dir="rtl"
      >
        <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
          {errorMsg && (
            <div className="bg-red-50 dark:bg-red-900/30 border-2 border-red-400 dark:border-red-500/50 text-red-800 dark:text-red-200 px-4 py-3 rounded-2xl flex justify-between items-start md:items-center shadow-sm animate-in fade-in slide-in-from-top-4 transition-colors">
              <div className="flex items-start">
                <AlertTriangle className="ml-3 shrink-0 mt-0.5" size={20} />
                <span className="font-bold text-sm md:text-base leading-relaxed">
                  {errorMsg}
                </span>
              </div>
              <button
                onClick={() => setErrorMsg("")}
                className="text-red-500 hover:text-red-800 dark:hover:text-red-200 bg-red-100 dark:bg-red-800/50 p-1.5 rounded-lg transition-colors mr-3 shrink-0"
              >
                <X size={18} />
              </button>
            </div>
          )}

          {/* شريط الأدوات العلوي */}
          <header className="relative bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 flex justify-between items-center transition-colors">
            <div>
              <h1 className="hidden md:block text-2xl font-bold text-indigo-900 dark:text-indigo-400">
                نظام الميزانية المتطور
              </h1>
              <h1 className="md:hidden text-2xl font-black text-indigo-900 dark:text-indigo-400 tracking-wider">
                BGT
              </h1>
              {/* عرض اسم المستخدم بدلاً من الإيميل */}
              <p className="hidden md:block text-sm text-slate-500 dark:text-slate-400 flex items-center mt-1">
                <User size={14} className="ml-1" />
                مرحباً، {user.email ? user.email.split("@")[0] : ""}
              </p>
            </div>

            {/* أزرار الديسكتوب */}
            <div className="hidden md:flex items-center space-x-2 space-x-reverse">
              <button
                onClick={() => handleMenuClick("settings")}
                className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-all"
                title="التصنيفات"
              >
                <Settings size={20} />
              </button>
              <button
                onClick={() => handleMenuClick("fixed")}
                className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-all"
                title="الالتزامات"
              >
                <Repeat size={20} />
              </button>
              <button
                onClick={() => handleMenuClick("goals")}
                className={`border p-2 rounded-lg transition-all ${
                  goals.some((g) => g.active)
                    ? "border-amber-400 dark:border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20"
                    : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-700"
                }`}
                title="الأهداف"
              >
                <Target size={20} />
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all ml-4"
                title="تسجيل خروج"
              >
                <LogOut size={20} />
              </button>
              <div className="flex items-center bg-indigo-50 dark:bg-indigo-900/30 rounded-lg p-1 border border-indigo-100 dark:border-indigo-800/50 mr-4">
                <CalendarDays
                  className="text-indigo-600 dark:text-indigo-400 ml-2"
                  size={18}
                />
                <div className="relative">
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="appearance-none bg-transparent text-indigo-900 dark:text-indigo-100 font-bold outline-none cursor-pointer text-sm py-1 pl-6 pr-1 relative"
                  >
                    {availableYears.map((y) => (
                      <option key={y} value={y} className="dark:bg-slate-800">
                        سنة {y}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="absolute left-1 top-1/2 -translate-y-1/2 text-indigo-600 dark:text-indigo-400 pointer-events-none"
                    size={14}
                  />
                </div>
              </div>
            </div>

            {/* زر قائمة الجوال */}
            <div className="md:hidden flex items-center space-x-2 space-x-reverse">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 p-2 rounded-lg text-slate-700 dark:text-slate-300 transition-colors"
              >
                <Menu size={24} />
              </button>
            </div>

            {/* قائمة الجوال المنسدلة */}
            {isMobileMenuOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 p-3 z-50 flex flex-col space-y-2 md:hidden">
                <div className="px-3 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 border-b border-slate-100 dark:border-slate-700 mb-1 flex items-center">
                  <User size={14} className="ml-1" />
                  {user.email ? user.email.split("@")[0] : ""}
                </div>
                <button
                  onClick={() => handleMenuClick("settings")}
                  className="flex items-center p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg text-slate-700 dark:text-slate-200"
                >
                  <Settings size={18} className="ml-3" /> إدارة التصنيفات
                </button>
                <button
                  onClick={() => handleMenuClick("fixed")}
                  className="flex items-center p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg text-slate-700 dark:text-slate-200"
                >
                  <Repeat size={18} className="ml-3" /> الالتزامات والثوابت
                </button>
                <button
                  onClick={() => handleMenuClick("goals")}
                  className="flex items-center p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg text-slate-700 dark:text-slate-200"
                >
                  <Target size={18} className="ml-3" /> خطط الادخار
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center p-3 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg"
                >
                  <LogOut size={18} className="ml-3" /> تسجيل خروج
                </button>
                <div className="border-t border-slate-100 dark:border-slate-700 my-1 pt-2"></div>
                <div className="flex items-center justify-between p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg border border-indigo-100 dark:border-indigo-800/50">
                  <span className="text-sm font-medium text-indigo-900 dark:text-indigo-200 flex items-center">
                    <CalendarDays size={16} className="ml-2" /> السنة المالية
                  </span>
                  <div className="relative">
                    <select
                      value={selectedYear}
                      onChange={(e) => {
                        setSelectedYear(Number(e.target.value));
                        setIsMobileMenuOpen(false);
                      }}
                      className="appearance-none bg-transparent font-bold text-indigo-700 dark:text-indigo-400 outline-none pl-5 pr-1"
                    >
                      {availableYears.map((y) => (
                        <option key={y} value={y} className="dark:bg-slate-800">
                          {y}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="absolute left-0 top-1/2 -translate-y-1/2 text-indigo-700 dark:text-indigo-400 pointer-events-none"
                      size={14}
                    />
                  </div>
                </div>
              </div>
            )}
          </header>

          {/* قسم الأهداف الذكية المتعددة */}
          {showGoalSettings && (
            <div className="bg-amber-50 dark:bg-slate-800 rounded-2xl p-6 shadow-md border border-amber-200 dark:border-slate-700/50 animate-in fade-in slide-in-from-top-4">
              <div className="flex justify-between items-center mb-6 border-b border-amber-200 dark:border-slate-700 pb-4">
                <h2 className="text-lg md:text-xl font-bold flex items-center text-amber-900 dark:text-amber-400">
                  <Target
                    className="ml-2 text-amber-600 dark:text-amber-500"
                    size={24}
                  />{" "}
                  خطط الادخار الذكية (متعددة)
                </h2>
                <button
                  onClick={() => setShowGoalSettings(false)}
                  className="text-amber-500 hover:text-amber-800 dark:hover:text-amber-300"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-700/30 p-4 rounded-xl border border-amber-200 dark:border-slate-700/50">
                  <h3 className="font-bold mb-4 text-amber-900 dark:text-amber-300 text-sm md:text-base">
                    إضافة هدف ادخاري جديد
                  </h3>
                  <form onSubmit={handleAddGoal} className="space-y-4">
                    <div className="flex flex-col md:flex-row gap-3">
                      <input
                        type="text"
                        value={goalName}
                        onChange={(e) => setGoalName(e.target.value)}
                        className="flex-1 px-4 py-2 bg-white dark:bg-slate-800 border border-amber-300 dark:border-slate-600 rounded-lg outline-none focus:border-amber-500 dark:focus:border-amber-400 dark:text-white transition-all focus:ring-2 focus:ring-amber-500/20 text-sm"
                        placeholder="اسم الهدف (مثال: سفر)"
                        required
                      />
                      <input
                        type="number"
                        value={goalAmount}
                        onChange={(e) => setGoalAmount(e.target.value)}
                        className="w-full md:w-1/3 px-4 py-2 bg-white dark:bg-slate-800 border border-amber-300 dark:border-slate-600 rounded-lg outline-none focus:border-amber-500 dark:focus:border-amber-400 dark:text-white transition-all focus:ring-2 focus:ring-amber-500/20 text-sm"
                        placeholder="المبلغ (ريال)"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-amber-800 dark:text-amber-200/70 mb-1">
                          يبدأ الخصم من:
                        </label>
                        <div className="flex space-x-1 space-x-reverse">
                          <div className="relative w-1/2">
                            <select
                              value={goalStartMonth}
                              onChange={(e) =>
                                setGoalStartMonth(Number(e.target.value))
                              }
                              className="w-full appearance-none px-2 py-2 pl-6 bg-white dark:bg-slate-800 border border-amber-300 dark:border-slate-600 rounded-lg outline-none focus:border-amber-500 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 dark:text-white transition-all text-sm"
                            >
                              <option
                                value=""
                                disabled
                                hidden
                                className="hidden"
                              ></option>
                              {months.map((m, i) => (
                                <option key={i} value={i}>
                                  {m}
                                </option>
                              ))}
                            </select>
                            <ChevronDown
                              className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                              size={14}
                            />
                          </div>
                          <div className="relative w-1/2">
                            <select
                              value={goalStartYear}
                              onChange={(e) =>
                                setGoalStartYear(Number(e.target.value))
                              }
                              className="w-full appearance-none px-2 py-2 pl-6 bg-white dark:bg-slate-800 border border-amber-300 dark:border-slate-600 rounded-lg outline-none focus:border-amber-500 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 dark:text-white transition-all text-sm"
                            >
                              <option
                                value=""
                                disabled
                                hidden
                                className="hidden"
                              ></option>
                              {availableYears.map((y) => (
                                <option key={y} value={y}>
                                  {y}
                                </option>
                              ))}
                            </select>
                            <ChevronDown
                              className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                              size={14}
                            />
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-amber-800 dark:text-amber-200/70 mb-1">
                          ينتهي بحلول:
                        </label>
                        <div className="flex space-x-1 space-x-reverse">
                          <div className="relative w-1/2">
                            <select
                              value={goalEndMonth}
                              onChange={(e) =>
                                setGoalEndMonth(Number(e.target.value))
                              }
                              className="w-full appearance-none px-2 py-2 pl-6 bg-white dark:bg-slate-800 border border-amber-300 dark:border-slate-600 rounded-lg outline-none focus:border-amber-500 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 dark:text-white transition-all text-sm"
                            >
                              <option
                                value=""
                                disabled
                                hidden
                                className="hidden"
                              ></option>
                              {months.map((m, i) => (
                                <option key={i} value={i}>
                                  {m}
                                </option>
                              ))}
                            </select>
                            <ChevronDown
                              className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                              size={14}
                            />
                          </div>
                          <div className="relative w-1/2">
                            <select
                              value={goalEndYear}
                              onChange={(e) =>
                                setGoalEndYear(Number(e.target.value))
                              }
                              className="w-full appearance-none px-2 py-2 pl-6 bg-white dark:bg-slate-800 border border-amber-300 dark:border-slate-600 rounded-lg outline-none focus:border-amber-500 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 dark:text-white transition-all text-sm"
                            >
                              <option
                                value=""
                                disabled
                                hidden
                                className="hidden"
                              ></option>
                              {availableYears.map((y) => (
                                <option key={y} value={y}>
                                  {y}
                                </option>
                              ))}
                            </select>
                            <ChevronDown
                              className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                              size={14}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <label className="flex items-center cursor-pointer text-amber-900 dark:text-amber-200 text-xs md:text-sm mt-2">
                      <input
                        type="checkbox"
                        checked={goalForce}
                        onChange={(e) => setGoalForce(e.target.checked)}
                        className="ml-2 rounded text-amber-600 dark:bg-slate-700 dark:border-slate-600 focus:ring-amber-500"
                      />
                      إجبار الخصم في الجدول (حتى لو الصافي بالسالب)
                    </label>
                    <button
                      type="submit"
                      className="w-full bg-amber-600 hover:bg-amber-500 dark:bg-amber-500 dark:hover:bg-amber-400 text-white font-medium py-2 rounded-lg transition-colors mt-2"
                    >
                      إضافة الهدف
                    </button>
                  </form>
                </div>

                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  <h3 className="font-bold text-amber-900 dark:text-amber-300 mb-2">
                    الأهداف الحالية:
                  </h3>
                  {goals.length === 0 ? (
                    <p className="text-sm text-amber-700/60 dark:text-slate-400">
                      لا يوجد أهداف مضافة حالياً.
                    </p>
                  ) : (
                    goals.map((g) => (
                      <div
                        key={g.id}
                        className={`p-3 md:p-4 rounded-xl border transition-all ${
                          g.active
                            ? "bg-white dark:bg-slate-800 border-amber-200 dark:border-slate-600 shadow-sm"
                            : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-60"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-bold text-amber-900 dark:text-amber-100 flex items-center text-sm md:text-base">
                              {g.name}
                              {!g.active && (
                                <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full mr-2">
                                  متوقف
                                </span>
                              )}
                            </h4>
                            <p className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-1">
                              {g.targetAmount.toLocaleString()} ريال
                            </p>
                          </div>
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <button
                              onClick={() => toggleGoalActive(g.id)}
                              className={`text-xs px-2 py-1 rounded-full ${
                                g.active
                                  ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                                  : "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                              }`}
                            >
                              {g.active ? "إيقاف" : "تفعيل"}
                            </button>
                            <button
                              onClick={() => deleteGoal(g.id)}
                              className="text-slate-400 hover:text-red-500 p-1"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center">
                          <Clock size={12} className="ml-1" />
                          من {months[g.startMonth]} {g.startYear} إلى{" "}
                          {months[g.targetMonth]} {g.targetYear}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* قسم العمليات الثابتة */}
          {showFixedSettings && (
            <div className="bg-slate-800 dark:bg-slate-800/90 rounded-2xl p-4 md:p-6 shadow-lg text-white border border-slate-700 animate-in fade-in slide-in-from-top-4">
              <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
                <h2 className="text-lg md:text-xl font-bold flex items-center">
                  <Repeat className="ml-2" size={24} /> إدارة الالتزامات
                  والثوابت
                </h2>
                <button
                  onClick={() => setShowFixedSettings(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-slate-700/50 p-4 rounded-xl border border-slate-600">
                  <form
                    onSubmit={handleAddFixedTransaction}
                    className="space-y-4"
                  >
                    <div className="flex bg-slate-900/50 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => handleFixedTypeChange("مصروف")}
                        className={`flex-1 py-1 text-sm rounded-md transition-all ${
                          fixedType === "مصروف"
                            ? "bg-rose-500 text-white"
                            : "text-slate-400"
                        }`}
                      >
                        مصروف
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFixedTypeChange("إيراد")}
                        className={`flex-1 py-1 text-sm rounded-md transition-all ${
                          fixedType === "إيراد"
                            ? "bg-emerald-500 text-white"
                            : "text-slate-400"
                        }`}
                      >
                        إيراد
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                        <input
                          type="radio"
                          name="fixedSubType"
                          value="مستمر"
                          checked={fixedSubType === "مستمر"}
                          onChange={() => setFixedSubType("مستمر")}
                          className="text-indigo-500 focus:ring-indigo-500 bg-slate-800 border-slate-600"
                        />
                        <span className="text-sm text-slate-300">مستمر</span>
                      </label>
                      <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                        <input
                          type="radio"
                          name="fixedSubType"
                          value="مؤقت"
                          checked={fixedSubType === "مؤقت"}
                          onChange={() => setFixedSubType("مؤقت")}
                          className="text-indigo-500 focus:ring-indigo-500 bg-slate-800 border-slate-600"
                        />
                        <span className="text-sm text-slate-300">
                          ينتهي بتاريخ
                        </span>
                      </label>
                      {fixedType === "مصروف" && (
                        <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                          <input
                            type="radio"
                            name="fixedSubType"
                            value="استحقاق"
                            checked={fixedSubType === "استحقاق"}
                            onChange={() => setFixedSubType("استحقاق")}
                            className="text-indigo-500 focus:ring-indigo-500 bg-slate-800 border-slate-600"
                          />
                          <span className="text-sm text-amber-400 font-bold">
                            مبلغ مستحق (أولوية 1)
                          </span>
                        </label>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="col-span-1 md:col-span-2">
                        <label className="text-xs text-slate-400 mb-1 block">
                          تاريخ بداية الخصم/الإضافة:
                        </label>
                        <div className="flex space-x-2 space-x-reverse">
                          <div className="relative w-1/2">
                            <select
                              value={fixedStartMonth}
                              onChange={(e) =>
                                setFixedStartMonth(e.target.value)
                              }
                              className="w-full appearance-none px-3 py-2 pl-8 bg-slate-800 border border-slate-600 rounded-lg text-white outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm"
                            >
                              <option
                                value=""
                                disabled
                                hidden
                                className="hidden"
                              ></option>
                              {months.map((m, i) => (
                                <option key={i} value={i}>
                                  {m}
                                </option>
                              ))}
                            </select>
                            <ChevronDown
                              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                              size={16}
                            />
                          </div>
                          <div className="relative w-1/2">
                            <select
                              value={fixedStartYear}
                              onChange={(e) =>
                                setFixedStartYear(e.target.value)
                              }
                              className="w-full appearance-none px-3 py-2 pl-8 bg-slate-800 border border-slate-600 rounded-lg text-white outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm"
                            >
                              <option
                                value=""
                                disabled
                                hidden
                                className="hidden"
                              ></option>
                              {availableYears.map((y) => (
                                <option key={y} value={y}>
                                  {y}
                                </option>
                              ))}
                            </select>
                            <ChevronDown
                              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                              size={16}
                            />
                          </div>
                        </div>
                      </div>
                      {fixedSubType === "استحقاق" ? (
                        <div className="col-span-1 md:col-span-2">
                          <input
                            type="number"
                            value={fixedTargetAmount}
                            onChange={(e) =>
                              setFixedTargetAmount(e.target.value)
                            }
                            placeholder="المبلغ الإجمالي المستحق"
                            className="w-full mb-3 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 transition-all text-sm"
                            required
                          />
                          <label className="text-xs text-slate-400 mb-1 block">
                            تاريخ الاستحقاق الدفع بالكامل بحلول:
                          </label>
                          <div className="flex space-x-2 space-x-reverse">
                            <div className="relative w-1/2">
                              <select
                                value={fixedEndMonth}
                                onChange={(e) =>
                                  setFixedEndMonth(e.target.value)
                                }
                                className="w-full appearance-none px-3 py-2 pl-8 bg-slate-800 border border-slate-600 rounded-lg text-white outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 transition-all text-sm"
                              >
                                <option
                                  value=""
                                  disabled
                                  hidden
                                  className="hidden"
                                ></option>
                                {months.map((m, i) => (
                                  <option key={i} value={i}>
                                    {m}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                size={16}
                              />
                            </div>
                            <div className="relative w-1/2">
                              <select
                                value={fixedEndYear}
                                onChange={(e) =>
                                  setFixedEndYear(e.target.value)
                                }
                                className="w-full appearance-none px-3 py-2 pl-8 bg-slate-800 border border-slate-600 rounded-lg text-white outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 transition-all text-sm"
                              >
                                <option
                                  value=""
                                  disabled
                                  hidden
                                  className="hidden"
                                ></option>
                                {availableYears.map((y) => (
                                  <option key={y} value={y}>
                                    {y}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                size={16}
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="col-span-1 md:col-span-2">
                          <input
                            type="number"
                            value={fixedAmount}
                            onChange={(e) => setFixedAmount(e.target.value)}
                            placeholder="المبلغ الشهري"
                            className="w-full mb-3 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm"
                            required
                          />
                          {fixedSubType === "مؤقت" && (
                            <div>
                              <label className="text-xs text-slate-400 mb-1 block">
                                تاريخ الانتهاء التلقائي:
                              </label>
                              <div className="flex space-x-2 space-x-reverse">
                                <div className="relative w-1/2">
                                  <select
                                    value={fixedEndMonth}
                                    onChange={(e) =>
                                      setFixedEndMonth(e.target.value)
                                    }
                                    className="w-full appearance-none px-3 py-2 pl-8 bg-slate-800 border border-slate-600 rounded-lg text-white outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm"
                                  >
                                    <option
                                      value=""
                                      disabled
                                      hidden
                                      className="hidden"
                                    ></option>
                                    {months.map((m, i) => (
                                      <option key={i} value={i}>
                                        {m}
                                      </option>
                                    ))}
                                  </select>
                                  <ChevronDown
                                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                    size={16}
                                  />
                                </div>
                                <div className="relative w-1/2">
                                  <select
                                    value={fixedEndYear}
                                    onChange={(e) =>
                                      setFixedEndYear(e.target.value)
                                    }
                                    className="w-full appearance-none px-3 py-2 pl-8 bg-slate-800 border border-slate-600 rounded-lg text-white outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm"
                                  >
                                    <option
                                      value=""
                                      disabled
                                      hidden
                                      className="hidden"
                                    ></option>
                                    {availableYears.map((y) => (
                                      <option key={y} value={y}>
                                        {y}
                                      </option>
                                    ))}
                                  </select>
                                  <ChevronDown
                                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                    size={16}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <div className="relative w-1/2">
                        <select
                          value={fixedCategory}
                          onChange={(e) => setFixedCategory(e.target.value)}
                          className="w-full appearance-none px-3 py-2 pl-8 bg-slate-800 border border-slate-600 rounded-lg text-white outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm"
                        >
                          <option
                            value=""
                            disabled
                            hidden
                            className="hidden"
                          ></option>
                          {fixedType === "إيراد"
                            ? categories.income.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))
                            : categories.expense.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                        </select>
                        <ChevronDown
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                          size={16}
                        />
                      </div>
                      <input
                        type="text"
                        value={fixedNote}
                        onChange={(e) => setFixedNote(e.target.value)}
                        placeholder="وصف"
                        className="w-1/2 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm"
                      />
                    </div>
                    <div className="flex space-x-2 space-x-reverse pt-2">
                      <button
                        type="submit"
                        className={`flex-1 py-2.5 rounded-lg font-medium transition-colors text-sm ${
                          editingFixedId
                            ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                            : fixedSubType === "استحقاق"
                            ? "bg-amber-600 hover:bg-amber-500 text-white"
                            : "bg-indigo-500 hover:bg-indigo-400 text-white"
                        }`}
                      >
                        {editingFixedId ? "حفظ التعديلات" : "اعتماد"}
                      </button>
                      {editingFixedId && (
                        <button
                          type="button"
                          onClick={cancelEditFixed}
                          className="px-4 py-2.5 bg-slate-600 hover:bg-slate-500 rounded-lg text-sm text-white"
                        >
                          إلغاء
                        </button>
                      )}
                    </div>
                  </form>
                </div>
                <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                  <h3 className="font-bold mb-2 text-slate-200">
                    المبرمج حالياً:
                  </h3>
                  {fixedTransactions.length === 0 ? (
                    <p className="text-slate-400 text-sm">لا يوجد عمليات</p>
                  ) : (
                    fixedTransactions.map((t) => (
                      <div
                        key={t.id}
                        className={`flex justify-between items-center p-3 rounded-lg border relative overflow-hidden ${
                          editingFixedId === t.id
                            ? "bg-indigo-900 border-indigo-500"
                            : "bg-slate-800 border-slate-700"
                        }`}
                      >
                        {t.subType === "استحقاق" && (
                          <div className="absolute top-0 right-0 w-1 h-full bg-amber-500"></div>
                        )}
                        <div className="pr-2">
                          <p className="text-sm font-bold flex items-center">
                            {t.category}{" "}
                            <span className="text-xs text-slate-400 mr-2 font-normal truncate max-w-[80px] md:max-w-none">
                              {t.note}
                            </span>
                          </p>
                          <p
                            className={`text-[10px] md:text-[11px] mt-1 flex items-center ${
                              t.subType === "استحقاق"
                                ? "text-amber-400"
                                : "text-slate-500"
                            }`}
                          >
                            <Clock size={10} className="ml-1" />
                            من {months[t.startMonth]} {t.startYear} ←{" "}
                            {t.subType === "مستمر"
                              ? "مستمر"
                              : `إلى ${months[t.endMonth]} ${t.endYear}`}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <span
                            className={`text-sm md:text-base font-bold ${
                              t.type === "إيراد"
                                ? "text-emerald-400"
                                : "text-rose-400"
                            }`}
                          >
                            {t.type === "إيراد" ? "+" : "-"}
                            {t.subType === "استحقاق"
                              ? t.targetAmount
                              : t.amount}
                          </span>
                          <div className="flex flex-col md:flex-row space-y-1 md:space-y-0 space-x-0 md:space-x-1 space-x-reverse">
                            <button
                              onClick={() => handleEditFixedTransaction(t)}
                              className="text-slate-400 hover:text-indigo-400 p-1"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => deleteFixedTransaction(t.id)}
                              className="text-slate-500 hover:text-red-400 p-1"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* قسم إعدادات التصنيفات */}
          {showSettings && (
            <div className="bg-indigo-900 dark:bg-slate-800/90 rounded-2xl p-4 md:p-6 shadow-lg text-white border border-indigo-800 dark:border-slate-700 animate-in fade-in slide-in-from-top-4">
              <div className="flex justify-between items-center mb-6 border-b border-indigo-700 dark:border-slate-700 pb-4">
                <h2 className="text-lg md:text-xl font-bold flex items-center">
                  <Settings className="ml-2" size={20} /> إدارة التصنيفات
                </h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-indigo-300 dark:text-slate-400 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-indigo-800/50 dark:bg-slate-700/50 p-4 rounded-xl border border-indigo-700 dark:border-slate-600">
                  <form onSubmit={addCategory} className="space-y-3">
                    <div className="flex bg-indigo-950/50 dark:bg-slate-900/50 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setNewCategoryType("مصروف")}
                        className={`flex-1 py-1 text-sm rounded-md transition-all ${
                          newCategoryType === "مصروف"
                            ? "bg-rose-500 text-white"
                            : "text-indigo-300 dark:text-slate-400"
                        }`}
                      >
                        مصروف
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewCategoryType("إيراد")}
                        className={`flex-1 py-1 text-sm rounded-md transition-all ${
                          newCategoryType === "إيراد"
                            ? "bg-emerald-500 text-white"
                            : "text-indigo-300 dark:text-slate-400"
                        }`}
                      >
                        إيراد
                      </button>
                    </div>
                    <div className="flex space-x-2 space-x-reverse">
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="اسم التصنيف..."
                        className="flex-1 bg-white/10 dark:bg-slate-800 border border-indigo-400/30 dark:border-slate-600 rounded-lg px-3 py-2 text-white placeholder-indigo-300 dark:placeholder-slate-500 outline-none text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        required
                      />
                      <button
                        type="submit"
                        className="bg-indigo-500 dark:bg-indigo-600 hover:bg-indigo-400 dark:hover:bg-indigo-500 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                      >
                        إضافة
                      </button>
                    </div>
                  </form>
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold mb-2 text-rose-300 dark:text-rose-400 text-sm">
                      تصنيفات المصروفات
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {categories.expense.map((c) => (
                        <span
                          key={c}
                          className="bg-white/10 dark:bg-slate-800 border border-rose-500/30 dark:border-rose-900/50 text-rose-100 dark:text-rose-200 px-2 py-1 rounded-full text-[11px] md:text-sm flex items-center"
                        >
                          {c}{" "}
                          <button
                            onClick={() => deleteCategory("مصروف", c)}
                            className="ml-1 text-rose-400 dark:text-rose-500 hover:text-rose-200 dark:hover:text-rose-300"
                          >
                            <Trash2 size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold mb-2 text-emerald-300 dark:text-emerald-400 text-sm">
                      تصنيفات الإيرادات
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {categories.income.map((c) => (
                        <span
                          key={c}
                          className="bg-white/10 dark:bg-slate-800 border border-emerald-500/30 dark:border-emerald-900/50 text-emerald-100 dark:text-emerald-200 px-2 py-1 rounded-full text-[11px] md:text-sm flex items-center"
                        >
                          {c}{" "}
                          <button
                            onClick={() => deleteCategory("إيراد", c)}
                            className="ml-1 text-emerald-400 dark:text-emerald-500 hover:text-emerald-200 dark:hover:text-emerald-300"
                          >
                            <Trash2 size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* البطاقات الأربع */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 md:p-6 shadow-sm border border-slate-100 dark:border-slate-700/50 flex flex-col md:flex-row items-center text-center md:text-right transition-colors">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full mb-2 md:mb-0 md:ml-4">
                <TrendingUp size={24} />
              </div>
              <div>
                <p className="text-[11px] md:text-sm text-slate-500 dark:text-slate-400 mb-1">
                  إيرادات {selectedYear}
                </p>
                <p className="text-lg md:text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {summary.totalIncome.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 md:p-6 shadow-sm border border-slate-100 dark:border-slate-700/50 flex flex-col md:flex-row items-center text-center md:text-right transition-colors">
              <div className="p-3 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full mb-2 md:mb-0 md:ml-4">
                <TrendingDown size={24} />
              </div>
              <div>
                <p className="text-[11px] md:text-sm text-slate-500 dark:text-slate-400 mb-1">
                  مصروفات {selectedYear}
                </p>
                <p className="text-lg md:text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {summary.totalExpense.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="bg-amber-50 dark:bg-slate-800 rounded-2xl p-4 md:p-6 shadow-sm border border-amber-100 dark:border-slate-700/50 flex flex-col md:flex-row items-center text-center md:text-right transition-colors">
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full mb-2 md:mb-0 md:ml-4">
                <Target size={24} />
              </div>
              <div>
                <p className="text-[11px] md:text-sm text-amber-700 dark:text-amber-500 mb-1">
                  مدخرات {selectedYear}
                </p>
                <p className="text-lg md:text-2xl font-bold text-amber-900 dark:text-amber-100">
                  {summary.totalSaved.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="bg-indigo-50 dark:bg-slate-800 rounded-2xl p-4 md:p-6 shadow-sm border border-indigo-100 dark:border-slate-700/50 flex flex-col md:flex-row items-center text-center md:text-right transition-colors">
              <div
                className={`p-3 rounded-full mb-2 md:mb-0 md:ml-4 ${
                  summary.net >= 0
                    ? "bg-indigo-200 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300"
                    : "bg-red-200 dark:bg-red-900/50 text-red-700 dark:text-red-400"
                }`}
              >
                <Wallet size={24} />
              </div>
              <div>
                <p className="text-[11px] md:text-sm text-indigo-800 dark:text-indigo-400 mb-1">
                  الصافي {selectedYear}
                </p>
                <p
                  className={`text-lg md:text-2xl font-bold ${
                    summary.net >= 0
                      ? "text-indigo-800 dark:text-indigo-300"
                      : "text-red-700 dark:text-red-400"
                  }`}
                >
                  {summary.net.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            {/* العمود الأيمن (الإدخال والعمليات الحديثة) */}
            <div className="lg:col-span-1 space-y-6">
              <div
                className={`bg-white dark:bg-slate-800 rounded-2xl p-4 md:p-6 shadow-sm border transition-all ${
                  editingTxId
                    ? "border-emerald-400 ring-2 ring-emerald-50 dark:ring-emerald-900/20"
                    : "border-slate-100 dark:border-slate-700/50"
                }`}
              >
                <h2 className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-100 mb-4 md:mb-6 flex items-center">
                  {editingTxId ? (
                    <Edit
                      className="ml-2 text-emerald-600 dark:text-emerald-400"
                      size={20}
                    />
                  ) : (
                    <PlusCircle
                      className="ml-2 text-indigo-600 dark:text-indigo-400"
                      size={20}
                    />
                  )}
                  {editingTxId ? "تعديل العملية اليومية" : "إضافة عملية"}
                </h2>
                <form onSubmit={handleAddTransaction} className="space-y-4">
                  <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg mb-4">
                    <button
                      type="button"
                      onClick={() => handleTypeChange("مصروف")}
                      className={`flex-1 py-1.5 md:py-2 text-xs md:text-sm font-medium rounded-md transition-all ${
                        type === "مصروف"
                          ? "bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      مصروف
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTypeChange("إيراد")}
                      className={`flex-1 py-1.5 md:py-2 text-xs md:text-sm font-medium rounded-md transition-all ${
                        type === "إيراد"
                          ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      إيراد
                    </button>
                  </div>

                  {/* الصف الأول: المبلغ والتصنيف (مقسمين 50/50) */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="min-w-0">
                      <label className="block text-[11px] md:text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                        المبلغ
                      </label>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:text-white transition-all text-sm"
                        placeholder="مثال: 500"
                        required
                      />
                    </div>
                    <div className="min-w-0">
                      <label className="block text-[11px] md:text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                        التصنيف
                      </label>
                      <div className="relative">
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full appearance-none px-3 py-2.5 pl-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:text-white transition-all text-sm"
                        >
                          <option
                            value=""
                            disabled
                            hidden
                            className="hidden"
                          ></option>
                          {type === "إيراد"
                            ? categories.income.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))
                            : categories.expense.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                        </select>
                        <ChevronDown
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                          size={16}
                        />
                      </div>
                    </div>
                  </div>

                  {/* الصف الثاني: التاريخ والتفاصيل (مقسمين 50/50) */}
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <div className="min-w-0">
                      <label className="block text-[11px] md:text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                        تاريخ العملية
                      </label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-2 md:px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:text-white transition-all text-[11px] md:text-sm"
                        required
                      />
                    </div>
                    <div className="min-w-0">
                      <label className="block text-[11px] md:text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                        التفاصيل (اختياري)
                      </label>
                      <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:text-white transition-all text-sm"
                        placeholder="اكتب ملاحظاتك..."
                      />
                    </div>
                  </div>

                  <div className="flex space-x-2 space-x-reverse pt-3">
                    <button
                      type="submit"
                      className={`flex-1 font-bold py-3 rounded-lg transition-colors text-white text-sm shadow-sm ${
                        editingTxId
                          ? "bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
                          : "bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                      }`}
                    >
                      {editingTxId ? "حفظ التعديلات" : "إضافة السجل"}
                    </button>
                    {editingTxId && (
                      <button
                        type="button"
                        onClick={cancelEditTx}
                        className="px-5 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-sm transition-colors font-bold"
                      >
                        إلغاء
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* سجل العمليات الحديثة */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 md:p-6 shadow-sm border border-slate-100 dark:border-slate-700/50 transition-colors">
                <h3 className="text-base md:text-lg font-bold text-slate-800 dark:text-slate-100 mb-3 md:mb-4">
                  أحدث عمليات {selectedYear}
                </h3>
                {transactions.filter((t) => t.year === selectedYear).length ===
                0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-6">
                    الجدول نظيف.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {transactions
                      .filter((t) => t.year === selectedYear)
                      .slice(0, 50)
                      .map((t) => (
                        <div
                          key={t.id}
                          className={`flex justify-between items-center p-2.5 rounded-lg border transition-colors ${
                            editingTxId === t.id
                              ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                              : "hover:bg-slate-50 dark:hover:bg-slate-700/50 border-slate-100 dark:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center space-x-2 space-x-reverse overflow-hidden">
                            <div
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                t.type === "إيراد"
                                  ? "bg-emerald-500"
                                  : "bg-rose-500"
                              }`}
                            ></div>
                            <div className="truncate">
                              <p className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                                {t.category}{" "}
                                <span className="font-normal text-[10px] text-slate-400 dark:text-slate-500 ml-1">
                                  {t.note}
                                </span>
                              </p>
                              <p
                                className="text-[10px] text-slate-500 dark:text-slate-400"
                                dir="ltr"
                              >
                                {formatDisplayDate(t.date)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 space-x-reverse shrink-0">
                            <span
                              className={`text-xs md:text-sm font-bold ${
                                t.type === "إيراد"
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-rose-600 dark:text-rose-400"
                              }`}
                            >
                              {t.type === "إيراد" ? "+" : "-"}
                              {t.amount}
                            </span>
                            <div className="flex flex-col md:flex-row">
                              <button
                                onClick={() => handleEditTransaction(t)}
                                className="text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 p-1"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => deleteTransaction(t.id)}
                                className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 p-1"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* العمود الأيسر (الجدول والفلتر) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 md:p-6 shadow-sm border border-slate-100 dark:border-slate-700/50 overflow-hidden transition-colors">
                {/* ترويسة الجدول مدمج معها الفلتر */}
                <div className="flex justify-between items-center mb-4 border-b dark:border-slate-700 pb-3">
                  <h2 className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-100">
                    التقرير الشهري
                  </h2>
                  <button
                    onClick={() => setShowTableFilter(!showTableFilter)}
                    className={`flex items-center text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                      showTableFilter ||
                      filterMonth !== "الكل" ||
                      filterSelectedCategories.length > 0
                        ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800"
                        : "text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    <Filter size={16} className="ml-1.5" />
                    {filterMonth !== "الكل" ||
                    filterSelectedCategories.length > 0
                      ? "مفلتر"
                      : "فلتر"}
                  </button>
                </div>

                {/* واجهة الفلتر */}
                {showTableFilter && (
                  <div className="bg-indigo-50/50 dark:bg-indigo-900/20 rounded-xl p-4 border border-indigo-100 dark:border-indigo-800/50 mb-6 animate-in fade-in slide-in-from-top-2">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="w-full md:w-1/3">
                        <label className="block text-xs font-medium text-indigo-900 dark:text-indigo-300 mb-1">
                          عرض شهر محدد:
                        </label>
                        <div className="relative">
                          <select
                            value={filterMonth}
                            onChange={(e) => setFilterMonth(e.target.value)}
                            className="w-full appearance-none px-2 py-1.5 pl-6 rounded-lg border border-indigo-200 dark:border-indigo-700/50 text-sm outline-none bg-white dark:bg-slate-800 dark:text-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                          >
                            <option value="الكل">
                              كل الأشهر (إخفاء الفلتر)
                            </option>
                            {months.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                            size={14}
                          />
                        </div>
                      </div>
                      <div className="w-full md:w-2/3">
                        <label className="block text-xs font-medium text-indigo-900 dark:text-indigo-300 mb-1">
                          تخصيص التصنيفات في الجدول:
                        </label>
                        <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                          {[...categories.expense].map((cat) => (
                            <button
                              key={cat}
                              onClick={() => toggleFilterCategory(cat)}
                              className={`text-[11px] md:text-xs px-2.5 py-1 rounded-full border transition-colors ${
                                filterSelectedCategories.includes(cat)
                                  ? "bg-indigo-500 dark:bg-indigo-600 text-white border-indigo-600 dark:border-indigo-500"
                                  : "bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600"
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                          * إذا لم تختر شيئاً سيتم عرض كل التصنيفات.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto pb-2">
                  <table className="w-full text-right border-collapse min-w-max whitespace-nowrap">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 text-xs md:text-sm border-y border-slate-200 dark:border-slate-700">
                        <th className="py-3 md:py-4 px-3 md:px-4 font-semibold text-right sticky right-0 bg-slate-50 dark:bg-slate-800/90 shadow-[-2px_0_5px_rgba(0,0,0,0.05)] dark:shadow-[-2px_0_5px_rgba(0,0,0,0.5)] z-10">
                          الشهر
                        </th>
                        <th className="py-3 md:py-4 px-3 md:px-4 font-semibold text-emerald-700 dark:text-emerald-500 border-r border-slate-200 dark:border-slate-700">
                          الإيرادات
                        </th>

                        {/* عرض التصنيفات بناءً على الفلتر */}
                        {displayedExpenseCategories.map((cat) => (
                          <th
                            key={cat}
                            className="py-3 md:py-4 px-3 md:px-4 font-semibold text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700"
                          >
                            {cat}
                          </th>
                        ))}

                        <th className="py-3 md:py-4 px-3 md:px-4 font-semibold text-rose-700 dark:text-rose-500 border-r border-slate-200 dark:border-slate-700">
                          إجمالي المصروفات
                        </th>
                        <th className="py-3 md:py-4 px-3 md:px-4 font-semibold text-amber-600 dark:text-amber-500 bg-amber-50/50 dark:bg-amber-900/10 border-r border-slate-200 dark:border-slate-700">
                          المدخرات
                        </th>
                        <th className="py-3 md:py-4 px-3 md:px-4 font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10 border-r border-slate-200 dark:border-slate-700">
                          الصافي
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-xs md:text-sm">
                      {displayedMonthsData.map((data, index) => {
                        const hasData =
                          data.income > 0 ||
                          data.expense > 0 ||
                          data.savings > 0;
                        return (
                          <tr
                            key={index}
                            className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30 ${
                              hasData ? "opacity-100" : "opacity-40"
                            }`}
                          >
                            <td className="py-2.5 md:py-3 px-3 md:px-4 font-medium text-slate-800 dark:text-slate-200 sticky right-0 bg-white dark:bg-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-700/30 shadow-[-2px_0_5px_rgba(0,0,0,0.02)] z-10">
                              {data.monthName}
                            </td>
                            <td className="py-2.5 md:py-3 px-3 md:px-4 text-emerald-600 dark:text-emerald-400 font-medium border-r border-slate-50 dark:border-slate-700/50">
                              {data.income > 0
                                ? data.income.toLocaleString()
                                : "-"}
                            </td>

                            {displayedExpenseCategories.map((cat) => (
                              <td
                                key={cat}
                                className="py-2.5 md:py-3 px-3 md:px-4 text-slate-600 dark:text-slate-400 border-r border-slate-50 dark:border-slate-700/50"
                              >
                                {data.expenseDetails[cat] > 0
                                  ? data.expenseDetails[cat].toLocaleString()
                                  : "-"}
                              </td>
                            ))}

                            <td className="py-2.5 md:py-3 px-3 md:px-4 text-rose-600 dark:text-rose-400 font-bold border-r border-slate-50 dark:border-slate-700/50 bg-rose-50/30 dark:bg-rose-900/10">
                              {data.expense > 0
                                ? data.expense.toLocaleString()
                                : "-"}
                            </td>

                            <td className="py-2.5 md:py-3 px-3 md:px-4 text-amber-600 dark:text-amber-400 font-bold border-r border-slate-50 dark:border-slate-700/50 bg-amber-50/30 dark:bg-amber-900/10">
                              {data.savings > 0
                                ? data.savings.toLocaleString()
                                : "-"}
                            </td>

                            <td
                              className={`py-2.5 md:py-3 px-3 md:px-4 font-bold border-r border-slate-50 dark:border-slate-700/50 ${
                                data.finalNet > 0
                                  ? "text-indigo-600 dark:text-indigo-400"
                                  : data.finalNet < 0
                                  ? "text-red-500 dark:text-red-400"
                                  : "text-slate-400 dark:text-slate-500"
                              }`}
                            >
                              {data.finalNet !== 0
                                ? data.finalNet.toLocaleString()
                                : "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="text-xs md:text-sm">
                      <tr className="bg-slate-100 dark:bg-slate-800/80 font-bold border-t-2 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100">
                        <td className="py-3 md:py-4 px-3 md:px-4 sticky right-0 bg-slate-100 dark:bg-slate-800/80 shadow-[-2px_0_5px_rgba(0,0,0,0.05)] z-10">
                          {filterMonth === "الكل"
                            ? "الإجمالي"
                            : "إجمالي الاختيار"}
                        </td>
                        <td className="py-3 md:py-4 px-3 md:px-4 text-emerald-700 dark:text-emerald-400 border-r border-slate-300 dark:border-slate-600">
                          {displayedMonthsData
                            .reduce((sum, m) => sum + m.income, 0)
                            .toLocaleString()}
                        </td>

                        {displayedExpenseCategories.map((cat) => (
                          <td
                            key={cat}
                            className="py-3 md:py-4 px-3 md:px-4 text-slate-700 dark:text-slate-300 border-r border-slate-300 dark:border-slate-600"
                          >
                            {displayedMonthsData
                              .reduce(
                                (sum, m) => sum + (m.expenseDetails[cat] || 0),
                                0
                              )
                              .toLocaleString()}
                          </td>
                        ))}

                        <td className="py-3 md:py-4 px-3 md:px-4 text-rose-700 dark:text-rose-400 border-r border-slate-300 dark:border-slate-600 bg-rose-100/50 dark:bg-rose-900/20">
                          {displayedMonthsData
                            .reduce((sum, m) => sum + m.expense, 0)
                            .toLocaleString()}
                        </td>

                        <td className="py-3 md:py-4 px-3 md:px-4 text-amber-700 dark:text-amber-400 border-r border-slate-300 dark:border-slate-600 bg-amber-100/50 dark:bg-amber-900/20">
                          {displayedMonthsData
                            .reduce((sum, m) => sum + m.savings, 0)
                            .toLocaleString()}
                        </td>

                        <td className="py-3 md:py-4 px-3 md:px-4 border-r border-slate-300 dark:border-slate-600 text-indigo-700 dark:text-indigo-400 font-black">
                          {displayedMonthsData
                            .reduce((sum, m) => sum + m.finalNet, 0)
                            .toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
