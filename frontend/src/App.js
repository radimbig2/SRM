import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
// Utility for rendering a status badge with appropriate colours
const badge = (status) => {
    const base = "px-2 py-1 rounded-full text-xs font-medium";
    if (status === "hired")
        return `${base} bg-emerald-500/15 text-emerald-200 border border-emerald-500/25`;
    if (status === "rejected")
        return `${base} bg-rose-500/15 text-rose-200 border border-rose-500/25`;
    if (status === "in_process")
        return `${base} bg-sky-500/15 text-sky-200 border border-sky-500/25`;
    return `${base} bg-slate-500/15 text-slate-200 border border-slate-500/25`;
};
// Simple card component used to display metrics
function Card(props) {
    return (_jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm", children: [_jsx("div", { className: "text-sm text-slate-300", children: props.title }), _jsx("div", { className: "mt-2 text-2xl font-semibold", children: props.value }), props.hint ? _jsx("div", { className: "mt-1 text-xs text-slate-400", children: props.hint }) : null] }));
}
// Modal component with overlay and close action
function Modal(props) {
    if (!props.open)
        return null;
    return (_jsxs("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4", children: [_jsx("div", { className: "absolute inset-0 bg-black/70", onClick: props.onClose }), _jsxs("div", { className: "relative w-full max-w-3xl rounded-2xl border border-white/10 bg-slate-900 shadow-xl", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-white/10 p-4", children: [_jsx("div", { className: "text-lg font-semibold", children: props.title }), _jsx("button", { className: "rounded-xl px-3 py-1 text-slate-300 hover:bg-white/5", onClick: props.onClose, children: "\u0417\u0430\u043A\u0440\u044B\u0442\u044C" })] }), _jsx("div", { className: "p-4", children: props.children })] })] }));
}
// Styled input component
function Input(props) {
    return (_jsx("input", { ...props, className: "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none " +
            "placeholder:text-slate-500 focus:border-sky-500/40" }));
}
// Styled select component
function Select(props) {
    return (_jsx("select", { ...props, className: "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none " +
            "focus:border-sky-500/40" }));
}
// Styled button component with variants
function Button(props) {
    const v = props.variant || "primary";
    const base = "rounded-xl px-3 py-2 text-sm font-medium transition border";
    const cls = v === "primary"
        ? `${base} bg-sky-500/20 border-sky-500/30 text-sky-100 hover:bg-sky-500/25`
        : v === "danger"
            ? `${base} bg-rose-500/15 border-rose-500/25 text-rose-100 hover:bg-rose-500/20`
            : `${base} bg-transparent border-white/10 text-slate-200 hover:bg-white/5`;
    return (_jsx("button", { ...props, className: cls + " " + (props.className || "") }));
}
// Utility to download data as CSV from an array of objects
function downloadCSV(filename, rows) {
    // 1) Collect columns
    const colSet = rows.reduce((acc, row) => {
        for (const key of Object.keys(row))
            acc.add(key);
        return acc;
    }, new Set());
    const cols = Array.from(colSet);
    // 2) Escape CSV values
    const escape = (value) => {
        const str = value == null ? "" : String(value);
        return /[",\n;]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };
    // 3) Build CSV
    const csv = [cols.join(";"), ...rows.map((r) => cols.map((c) => escape(r[c])).join(";"))].join("\n");
    // 4) Download
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}
// Key for storing the active recruiter selection in localStorage
const ACTIVE_RECRUITER_KEY = "crm.activeRecruiterId";
export default function App() {
    // Active tab state
    const [tab, setTab] = useState("Воронка");
    // Master data lists
    const [clients, setClients] = useState([]);
    const [recruiters, setRecruiters] = useState([]);
    const [vacancies, setVacancies] = useState([]);
    const [pipeline, setPipeline] = useState([]);
    // Active recruiter ID stored in localStorage to persist across sessions
    const [activeRecruiterId, setActiveRecruiterId] = useState(() => {
        const v = localStorage.getItem(ACTIVE_RECRUITER_KEY);
        return v ? Number(v) : "";
    });
    // Filters for the pipeline
    const [filters, setFilters] = useState({});
    // Modal state for adding and editing applications
    const [openAddApp, setOpenAddApp] = useState(false);
    const [openEditApp, setOpenEditApp] = useState(null);
    // Payment list and form for editing payments
    const [payments, setPayments] = useState([]);
    const [payForm, setPayForm] = useState({ paid_date: new Date().toISOString().slice(0, 10), amount: 0, note: "" });
    // Forms for creating new clients/recruiters/vacancies
    const [newClientName, setNewClientName] = useState("");
    const [newRecruiterName, setNewRecruiterName] = useState("");
    const [newVacancyTitle, setNewVacancyTitle] = useState("");
    const [newVacancyClientId, setNewVacancyClientId] = useState("");
    const [newVacancyFee, setNewVacancyFee] = useState(0);
    // Application form initial values
    const today = new Date().toISOString().slice(0, 10);
    const [addForm, setAddForm] = useState({
        full_name: "",
        phone: "",
        email: "",
        notes: "",
        client_id: "",
        vacancy_id: "",
        recruiter_id: "",
        date_contacted: today,
        status: "new",
        rejection_date: "",
        start_date: "",
        paid: false,
        paid_date: "",
        payment_amount: 0,
        is_replacement: false,
        replacement_of_id: "",
        replacement_note: "",
    });
    // Loading and error state
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState(null);
    // Fetch all master data
    async function refreshAll() {
        setErr(null);
        try {
            const [c, r, v] = await Promise.all([api.clients(), api.recruiters(), api.vacancies()]);
            setClients(c);
            setRecruiters(r);
            setVacancies(v);
        }
        catch (e) {
            setErr(String(e?.message || e));
        }
    }
    // Fetch pipeline data with current filters
    async function refreshPipeline() {
        setErr(null);
        try {
            const rows = await api.pipeline(filters);
            setPipeline(rows);
        }
        catch (e) {
            setErr(String(e?.message || e));
        }
    }
    // Initial load of master data
    useEffect(() => {
        refreshAll();
    }, []);
    // Refresh pipeline whenever filters change
    useEffect(() => {
        refreshPipeline();
    }, [filters.client_id, filters.recruiter_id, filters.status, filters.search]);
    // Persist active recruiter selection to localStorage and update default recruiter in add form
    useEffect(() => {
        if (activeRecruiterId) {
            localStorage.setItem(ACTIVE_RECRUITER_KEY, String(activeRecruiterId));
            setAddForm((f) => ({ ...f, recruiter_id: activeRecruiterId }));
        }
        else {
            localStorage.removeItem(ACTIVE_RECRUITER_KEY);
        }
    }, [activeRecruiterId]);
    // Filter vacancies based on selected client for add form
    const filteredVacancies = useMemo(() => {
        if (!addForm.client_id)
            return vacancies;
        return vacancies.filter((v) => v.client_id === addForm.client_id);
    }, [vacancies, addForm.client_id]);
    // Determine the selected vacancy to auto-fill payment amount when initial payment is created
    const selectedVacancy = useMemo(() => {
        if (!addForm.vacancy_id)
            return null;
        return vacancies.find((v) => v.id === addForm.vacancy_id) || null;
    }, [vacancies, addForm.vacancy_id]);
    // Auto-set payment amount when toggling the 'paid' checkbox in add form
    useEffect(() => {
        if (selectedVacancy && addForm.paid && (!addForm.payment_amount || addForm.payment_amount === 0)) {
            setAddForm((f) => ({ ...f, payment_amount: selectedVacancy.fee_amount || 0 }));
        }
    }, [selectedVacancy, addForm.paid]);
    // Compute summary statistics for the pipeline
    const stats = useMemo(() => {
        const total = pipeline.length;
        const hired = pipeline.filter((p) => p.status === "hired").length;
        const paidCount = pipeline.filter((p) => p.paid).length;
        const paidSum = pipeline.reduce((sum, p) => sum + (p.payment_amount || 0), 0);
        return { total, hired, paidCount, paidSum: Math.round(paidSum * 100) / 100 };
    }, [pipeline]);
    // Create a client
    async function addClient() {
        if (!newClientName.trim())
            return;
        setLoading(true);
        try {
            await api.createClient(newClientName.trim());
            setNewClientName("");
            await refreshAll();
        }
        catch (e) {
            setErr(String(e?.message || e));
        }
        finally {
            setLoading(false);
        }
    }
    // Create a recruiter
    async function addRecruiter() {
        if (!newRecruiterName.trim())
            return;
        setLoading(true);
        try {
            await api.createRecruiter(newRecruiterName.trim());
            setNewRecruiterName("");
            await refreshAll();
        }
        catch (e) {
            setErr(String(e?.message || e));
        }
        finally {
            setLoading(false);
        }
    }
    // Create a vacancy
    async function addVacancy() {
        if (!newVacancyTitle.trim() || !newVacancyClientId)
            return;
        setLoading(true);
        try {
            await api.createVacancy({ client_id: Number(newVacancyClientId), title: newVacancyTitle.trim(), fee_amount: Number(newVacancyFee || 0) });
            setNewVacancyTitle("");
            setNewVacancyFee(0);
            await refreshAll();
        }
        catch (e) {
            setErr(String(e?.message || e));
        }
        finally {
            setLoading(false);
        }
    }
    // Submit a new application (creates candidate and application)
    async function submitAddApplication() {
        setErr(null);
        if (!addForm.full_name.trim())
            return setErr("Введите имя кандидата");
        if (!addForm.vacancy_id)
            return setErr("Выберите вакансию");
        if (!addForm.recruiter_id)
            return setErr("Выберите рекрутера");
        // Validate status-specific fields
        if (addForm.status === "rejected" && !addForm.rejection_date)
            return setErr("Для rejected нужна дата отказа");
        if (addForm.status === "hired" && !addForm.start_date)
            return setErr("Для hired нужна дата выхода");
        if (addForm.paid && !addForm.paid_date)
            return setErr("Если оплачено, укажи дату платежа");
        setLoading(true);
        try {
            // 1) Create candidate
            const candidate = await api.createCandidate({
                full_name: addForm.full_name.trim(),
                phone: addForm.phone || null,
                email: addForm.email || null,
                notes: addForm.notes || null,
            });
            // 2) Create application with optional initial payment
            await api.createApplication({
                candidate_id: candidate.id,
                vacancy_id: Number(addForm.vacancy_id),
                recruiter_id: Number(addForm.recruiter_id),
                date_contacted: addForm.date_contacted,
                status: addForm.status,
                rejection_date: addForm.rejection_date ? addForm.rejection_date : null,
                start_date: addForm.start_date ? addForm.start_date : null,
                paid: addForm.paid,
                paid_date: addForm.paid_date ? addForm.paid_date : null,
                payment_amount: Number(addForm.payment_amount || 0),
                is_replacement: addForm.is_replacement,
                replacement_of_id: addForm.replacement_of_id ? Number(addForm.replacement_of_id) : null,
                replacement_note: addForm.replacement_note || null,
            });
            // Reset form and refresh pipeline
            setOpenAddApp(false);
            setAddForm({
                full_name: "",
                phone: "",
                email: "",
                notes: "",
                client_id: "",
                vacancy_id: "",
                recruiter_id: activeRecruiterId || "",
                date_contacted: today,
                status: "new",
                rejection_date: "",
                start_date: "",
                paid: false,
                paid_date: "",
                payment_amount: 0,
                is_replacement: false,
                replacement_of_id: "",
                replacement_note: "",
            });
            await refreshPipeline();
        }
        catch (e) {
            setErr(String(e?.message || e));
        }
        finally {
            setLoading(false);
        }
    }
    // Open edit modal and fetch payments for the selected application
    async function openEdit(row) {
        setOpenEditApp(row);
        setPayForm({ paid_date: new Date().toISOString().slice(0, 10), amount: 0, note: "" });
        try {
            const list = await api.payments(row.id);
            setPayments(list);
        }
        catch (e) {
            setErr(String(e?.message || e));
        }
    }
    // Save changes to an application (status, dates, replacement info)
    async function saveEditApplication(row) {
        setErr(null);
        if (row.status === "rejected" && !row.rejection_date)
            return setErr("Для rejected нужна дата отказа");
        if (row.status === "hired" && !row.start_date)
            return setErr("Для hired нужна дата выхода");
        setLoading(true);
        try {
            await api.updateApplication(row.id, {
                status: row.status,
                date_contacted: row.date_contacted,
                rejection_date: row.rejection_date,
                start_date: row.start_date,
                is_replacement: row.is_replacement,
                replacement_of_id: row.replacement_of_id,
                replacement_note: row.replacement_note,
            });
            setOpenEditApp(null);
            await refreshPipeline();
        }
        catch (e) {
            setErr(String(e?.message || e));
        }
        finally {
            setLoading(false);
        }
    }
    // Delete an application after user confirmation
    async function deleteApplication(id) {
        if (!confirm("Удалить запись по кандидату?"))
            return;
        setLoading(true);
        try {
            await api.deleteApplication(id);
            await refreshPipeline();
        }
        catch (e) {
            setErr(String(e?.message || e));
        }
        finally {
            setLoading(false);
        }
    }
    // Add a payment to the currently edited application
    async function addPaymentToCurrent() {
        if (!openEditApp)
            return;
        if (!payForm.paid_date)
            return setErr("Укажи дату платежа");
        if (!payForm.amount || payForm.amount <= 0)
            return setErr("Сумма платежа должна быть > 0");
        setLoading(true);
        try {
            await api.addPayment(openEditApp.id, {
                paid_date: payForm.paid_date,
                amount: payForm.amount,
                note: payForm.note || null,
            });
            const list = await api.payments(openEditApp.id);
            setPayments(list);
            await refreshPipeline();
            // Update openEditApp with fresh data from pipeline
            const fresh = (await api.pipeline({})).find((x) => x.id === openEditApp.id) || openEditApp;
            setOpenEditApp(fresh);
            setPayForm({ paid_date: new Date().toISOString().slice(0, 10), amount: 0, note: "" });
        }
        catch (e) {
            setErr(String(e?.message || e));
        }
        finally {
            setLoading(false);
        }
    }
    // Delete a payment
    async function deletePayment(paymentId) {
        if (!openEditApp)
            return;
        if (!confirm("Удалить платеж?"))
            return;
        setLoading(true);
        try {
            await api.deletePayment(paymentId);
            const list = await api.payments(openEditApp.id);
            setPayments(list);
            await refreshPipeline();
            const fresh = (await api.pipeline({})).find((x) => x.id === openEditApp.id) || openEditApp;
            setOpenEditApp(fresh);
        }
        catch (e) {
            setErr(String(e?.message || e));
        }
        finally {
            setLoading(false);
        }
    }
    // State for earnings reports
    const now = new Date();
    const [repYear, setRepYear] = useState(now.getFullYear());
    const [repMonth, setRepMonth] = useState(now.getMonth() + 1);
    const [repTotal, setRepTotal] = useState(null);
    const [repItems, setRepItems] = useState([]);
    // Load earnings report for selected year and month
    async function loadReport() {
        setErr(null);
        setLoading(true);
        try {
            const report = await api.earnings(repYear, repMonth);
            setRepTotal(report.total);
            setRepItems(report.items);
        }
        catch (e) {
            setErr(String(e?.message || e));
        }
        finally {
            setLoading(false);
        }
    }
    // Load report when switching to the reports tab
    useEffect(() => {
        if (tab === "Отчеты")
            loadReport();
    }, [tab]);
    // List of applications for selecting replacement application (in add/edit forms)
    const replacementOptions = useMemo(() => {
        return pipeline.slice(0, 500);
    }, [pipeline]);
    // UI Rendering
    return (_jsxs("div", { className: "min-h-screen", children: [_jsx("div", { className: "sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur", children: _jsxs("div", { className: "mx-auto max-w-6xl px-4 py-4 flex flex-col md:flex-row md:items-center gap-3 justify-between", children: [_jsxs("div", { children: [_jsx("div", { className: "text-xl font-semibold", children: "Recruiting CRM" }), _jsx("div", { className: "text-xs text-slate-400", children: "fee \u0443 \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0439, \u043F\u043B\u0430\u0442\u0435\u0436\u0438 (\u0447\u0430\u0441\u0442\u0438\u0447\u043D\u044B\u0435), \u0437\u0430\u043C\u0435\u043D\u044B \u0438\u0437 \u0441\u043F\u0438\u0441\u043A\u0430, CSV" })] }), _jsxs("div", { className: "flex flex-col md:flex-row gap-2 md:items-center", children: [_jsxs("div", { className: "flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2", children: [_jsx("div", { className: "text-xs text-slate-400", children: "\u0410\u043A\u0442\u0438\u0432\u043D\u044B\u0439 \u0440\u0435\u043A\u0440\u0443\u0442\u0435\u0440" }), _jsxs("select", { className: "bg-transparent text-sm outline-none", value: activeRecruiterId, onChange: (e) => setActiveRecruiterId(e.target.value ? Number(e.target.value) : ""), children: [_jsx("option", { value: "", children: "\u043D\u0435 \u0432\u044B\u0431\u0440\u0430\u043D" }), recruiters.map((r) => (_jsx("option", { value: r.id, children: r.name }, r.id)))] })] }), _jsx("div", { className: "flex gap-2 flex-wrap", children: ["Воронка", "Клиенты", "Вакансии", "Рекрутеры", "Отчеты"].map((t) => (_jsx("button", { onClick: () => setTab(t), className: "rounded-xl px-3 py-2 text-sm border transition " +
                                            (tab === t
                                                ? "bg-white/10 border-white/15 text-white"
                                                : "bg-transparent border-white/10 text-slate-300 hover:bg-white/5"), children: t }, t))) })] })] }) }), _jsxs("div", { className: "mx-auto max-w-6xl px-4 py-6", children: [err ? (_jsx("div", { className: "mb-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 p-3 text-rose-100 text-sm", children: err })) : null, tab === "Воронка" && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-3", children: [_jsx(Card, { title: "\u0412\u0441\u0435\u0433\u043E", value: stats.total }), _jsx(Card, { title: "Hired", value: stats.hired }), _jsx(Card, { title: "\u041E\u043F\u043B\u0430\u0447\u0435\u043D\u043E (\u0448\u0442.)", value: stats.paidCount }), _jsx(Card, { title: "\u041E\u043F\u043B\u0430\u0447\u0435\u043D\u043E (\u0441\u0443\u043C\u043C\u0430)", value: stats.paidSum, hint: "\u0441\u0443\u043C\u043C\u0430 \u0432\u0441\u0435\u0445 \u043F\u043B\u0430\u0442\u0435\u0436\u0435\u0439 \u043F\u043E \u0432\u043E\u0440\u043E\u043D\u043A\u0435" })] }), _jsx("div", { className: "mt-5 rounded-2xl border border-white/10 bg-white/5 p-4", children: _jsxs("div", { className: "flex flex-col md:flex-row md:items-end gap-3 justify-between", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-3 w-full", children: [_jsxs("div", { children: [_jsx("div", { className: "text-xs text-slate-400 mb-1", children: "\u041A\u043B\u0438\u0435\u043D\u0442" }), _jsxs(Select, { value: filters.client_id ?? "", onChange: (e) => setFilters((f) => ({ ...f, client_id: e.target.value ? Number(e.target.value) : undefined })), children: [_jsx("option", { value: "", children: "\u0412\u0441\u0435" }), clients.map((c) => (_jsx("option", { value: c.id, children: c.name }, c.id)))] })] }), _jsxs("div", { children: [_jsx("div", { className: "text-xs text-slate-400 mb-1", children: "\u0420\u0435\u043A\u0440\u0443\u0442\u0435\u0440" }), _jsxs(Select, { value: filters.recruiter_id ?? "", onChange: (e) => setFilters((f) => ({ ...f, recruiter_id: e.target.value ? Number(e.target.value) : undefined })), children: [_jsx("option", { value: "", children: "\u0412\u0441\u0435" }), recruiters.map((r) => (_jsx("option", { value: r.id, children: r.name }, r.id)))] })] }), _jsxs("div", { children: [_jsx("div", { className: "text-xs text-slate-400 mb-1", children: "\u0421\u0442\u0430\u0442\u0443\u0441" }), _jsxs(Select, { value: filters.status ?? "", onChange: (e) => setFilters((f) => ({ ...f, status: e.target.value ? e.target.value : undefined })), children: [_jsx("option", { value: "", children: "\u0412\u0441\u0435" }), _jsx("option", { value: "new", children: "new" }), _jsx("option", { value: "in_process", children: "in_process" }), _jsx("option", { value: "rejected", children: "rejected" }), _jsx("option", { value: "hired", children: "hired" })] })] }), _jsxs("div", { children: [_jsx("div", { className: "text-xs text-slate-400 mb-1", children: "\u041F\u043E\u0438\u0441\u043A" }), _jsx(Input, { placeholder: "\u043A\u0430\u043D\u0434\u0438\u0434\u0430\u0442, \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u044F, \u043A\u043B\u0438\u0435\u043D\u0442, \u0440\u0435\u043A\u0440\u0443\u0442\u0435\u0440", value: filters.search ?? "", onChange: (e) => setFilters((f) => ({ ...f, search: e.target.value || undefined })) })] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { variant: "ghost", onClick: () => refreshPipeline(), disabled: loading, children: "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C" }), _jsx(Button, { variant: "ghost", onClick: () => {
                                                        downloadCSV("pipeline.csv", pipeline.map((p) => ({
                                                            id: p.id,
                                                            candidate: p.candidate_name,
                                                            client: p.client_name,
                                                            vacancy: p.vacancy_title,
                                                            recruiter: p.recruiter_name,
                                                            date_contacted: p.date_contacted,
                                                            status: p.status,
                                                            rejection_date: p.rejection_date ?? "",
                                                            start_date: p.start_date ?? "",
                                                            paid: p.paid ? "yes" : "no",
                                                            last_paid_date: p.paid_date ?? "",
                                                            total_paid: p.payment_amount,
                                                            is_replacement: p.is_replacement ? "yes" : "no",
                                                            replacement_of_id: p.replacement_of_id ?? "",
                                                            replacement_note: p.replacement_note ?? "",
                                                        })));
                                                    }, children: "\u042D\u043A\u0441\u043F\u043E\u0440\u0442 CSV" }), _jsx(Button, { onClick: () => setOpenAddApp(true), disabled: loading, children: "+ \u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C" })] })] }) }), _jsx("div", { className: "mt-4 overflow-auto rounded-2xl border border-white/10", children: _jsxs("table", { className: "min-w-full text-sm", children: [_jsx("thead", { className: "bg-white/5 text-slate-300", children: _jsxs("tr", { children: [_jsx("th", { className: "text-left p-3", children: "\u041A\u0430\u043D\u0434\u0438\u0434\u0430\u0442" }), _jsx("th", { className: "text-left p-3", children: "\u041A\u043B\u0438\u0435\u043D\u0442" }), _jsx("th", { className: "text-left p-3", children: "\u0412\u0430\u043A\u0430\u043D\u0441\u0438\u044F" }), _jsx("th", { className: "text-left p-3", children: "\u0420\u0435\u043A\u0440\u0443\u0442\u0435\u0440" }), _jsx("th", { className: "text-left p-3", children: "\u0414\u0430\u0442\u0430 \u043E\u0431\u0449\u0435\u043D\u0438\u044F" }), _jsx("th", { className: "text-left p-3", children: "\u0421\u0442\u0430\u0442\u0443\u0441" }), _jsx("th", { className: "text-left p-3", children: "\u041E\u043F\u043B\u0430\u0442\u0430" }), _jsx("th", { className: "text-left p-3", children: "\u041F\u043E\u0441\u043B\u0435\u0434\u043D. \u0434\u0430\u0442\u0430" }), _jsx("th", { className: "text-left p-3", children: "\u0421\u0443\u043C\u043C\u0430" }), _jsx("th", { className: "text-left p-3", children: "\u0417\u0430\u043C\u0435\u043D\u0430" }), _jsx("th", { className: "text-left p-3" })] }) }), _jsxs("tbody", { children: [pipeline.map((row) => (_jsxs("tr", { className: "border-t border-white/10 hover:bg-white/5", children: [_jsx("td", { className: "p-3 font-medium", children: row.candidate_name }), _jsx("td", { className: "p-3", children: row.client_name }), _jsxs("td", { className: "p-3", children: [_jsx("div", { className: "font-medium", children: row.vacancy_title }), _jsxs("div", { className: "text-xs text-slate-400", children: ["fee: ", row.vacancy_fee] })] }), _jsx("td", { className: "p-3", children: row.recruiter_name }), _jsx("td", { className: "p-3", children: row.date_contacted }), _jsx("td", { className: "p-3", children: _jsx("span", { className: badge(row.status), children: row.status }) }), _jsx("td", { className: "p-3", children: row.paid ? "да" : "нет" }), _jsx("td", { className: "p-3", children: row.paid_date ?? "-" }), _jsx("td", { className: "p-3", children: row.payment_amount ?? 0 }), _jsx("td", { className: "p-3", children: row.is_replacement ? "да" : "нет" }), _jsxs("td", { className: "p-3 flex gap-2 justify-end", children: [_jsx(Button, { variant: "ghost", onClick: () => openEdit(row), children: "\u0420\u0435\u0434\u0430\u043A\u0442." }), _jsx(Button, { variant: "danger", onClick: () => deleteApplication(row.id), children: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C" })] })] }, row.id))), pipeline.length === 0 && (_jsx("tr", { children: _jsx("td", { className: "p-5 text-slate-400", colSpan: 11, children: "\u041F\u043E\u043A\u0430 \u043F\u0443\u0441\u0442\u043E. \u041D\u0430\u0436\u043C\u0438 \u201C\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C\u201D." }) }))] })] }) }), _jsxs(Modal, { open: openAddApp, title: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043A\u0430\u043D\u0434\u0438\u0434\u0430\u0442\u0430 \u0432 \u0432\u043E\u0440\u043E\u043D\u043A\u0443", onClose: () => setOpenAddApp(false), children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [_jsxs("div", { className: "md:col-span-2", children: [_jsx("div", { className: "text-xs text-slate-400 mb-1", children: "\u0424\u0418\u041E \u043A\u0430\u043D\u0434\u0438\u0434\u0430\u0442\u0430" }), _jsx(Input, { value: addForm.full_name, onChange: (e) => setAddForm((f) => ({ ...f, full_name: e.target.value })) })] }), _jsxs("div", { children: [_jsx("div", { className: "text-xs text-slate-400 mb-1", children: "\u0422\u0435\u043B\u0435\u0444\u043E\u043D" }), _jsx(Input, { value: addForm.phone, onChange: (e) => setAddForm((f) => ({ ...f, phone: e.target.value })) })] }), _jsxs("div", { children: [_jsx("div", { className: "text-xs text-slate-400 mb-1", children: "Email" }), _jsx(Input, { value: addForm.email, onChange: (e) => setAddForm((f) => ({ ...f, email: e.target.value })) })] }), _jsxs("div", { className: "md:col-span-2", children: [_jsx("div", { className: "text-xs text-slate-400 mb-1", children: "\u0417\u0430\u043C\u0435\u0442\u043A\u0438" }), _jsx(Input, { value: addForm.notes, onChange: (e) => setAddForm((f) => ({ ...f, notes: e.target.value })) })] }), _jsxs("div", { children: [_jsx("div", { className: "text-xs text-slate-400 mb-1", children: "\u041A\u043B\u0438\u0435\u043D\u0442" }), _jsxs(Select, { value: addForm.client_id, onChange: (e) => setAddForm((f) => ({ ...f, client_id: e.target.value ? Number(e.target.value) : "", vacancy_id: "", payment_amount: 0 })), children: [_jsx("option", { value: "", children: "\u0412\u044B\u0431\u0440\u0430\u0442\u044C" }), clients.map((c) => (_jsx("option", { value: c.id, children: c.name }, c.id)))] })] }), _jsxs("div", { children: [_jsx("div", { className: "text-xs text-slate-400 mb-1", children: "\u0412\u0430\u043A\u0430\u043D\u0441\u0438\u044F" }), _jsxs(Select, { value: addForm.vacancy_id, onChange: (e) => {
                                                            const vid = e.target.value ? Number(e.target.value) : "";
                                                            const vac = vacancies.find((v) => v.id === vid);
                                                            setAddForm((f) => ({
                                                                ...f,
                                                                vacancy_id: vid,
                                                                payment_amount: f.paid ? Number(vac?.fee_amount || 0) : f.payment_amount,
                                                            }));
                                                        }, children: [_jsx("option", { value: "", children: "\u0412\u044B\u0431\u0440\u0430\u0442\u044C" }), filteredVacancies.map((v) => (_jsxs("option", { value: v.id, children: [v.title, " (fee ", v.fee_amount, ")"] }, v.id)))] })] }), _jsxs("div", { children: [_jsx("div", { className: "text-xs text-slate-400 mb-1", children: "\u0420\u0435\u043A\u0440\u0443\u0442\u0435\u0440" }), _jsxs(Select, { value: addForm.recruiter_id, onChange: (e) => setAddForm((f) => ({ ...f, recruiter_id: e.target.value ? Number(e.target.value) : "" })), children: [_jsx("option", { value: "", children: "\u0412\u044B\u0431\u0440\u0430\u0442\u044C" }), recruiters.map((r) => (_jsx("option", { value: r.id, children: r.name }, r.id)))] }), _jsx("div", { className: "mt-1 text-xs text-slate-500", children: "\u041F\u043E\u0434\u0441\u0442\u0430\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u0438\u0437 \u201C\u0410\u043A\u0442\u0438\u0432\u043D\u044B\u0439 \u0440\u0435\u043A\u0440\u0443\u0442\u0435\u0440\u201D \u0441\u0432\u0435\u0440\u0445\u0443" })] }), _jsxs("div", { children: [_jsx("div", { className: "text-xs text-slate-400 mb-1", children: "\u0414\u0430\u0442\u0430 \u043E\u0431\u0449\u0435\u043D\u0438\u044F" }), _jsx(Input, { type: "date", value: addForm.date_contacted, onChange: (e) => setAddForm((f) => ({ ...f, date_contacted: e.target.value })) })] }), _jsxs("div", { children: [_jsx("div", { className: "text-xs text-slate-400 mb-1", children: "\u0421\u0442\u0430\u0442\u0443\u0441" }), _jsxs(Select, { value: addForm.status, onChange: (e) => setAddForm((f) => ({ ...f, status: e.target.value })), children: [_jsx("option", { value: "new", children: "new" }), _jsx("option", { value: "in_process", children: "in_process" }), _jsx("option", { value: "rejected", children: "rejected" }), _jsx("option", { value: "hired", children: "hired" })] })] }), _jsxs("div", { children: [_jsx("div", { className: "text-xs text-slate-400 mb-1", children: "\u0414\u0430\u0442\u0430 \u043E\u0442\u043A\u0430\u0437\u0430 (\u0435\u0441\u043B\u0438 rejected)" }), _jsx(Input, { type: "date", value: addForm.rejection_date, onChange: (e) => setAddForm((f) => ({ ...f, rejection_date: e.target.value })) })] }), _jsxs("div", { children: [_jsx("div", { className: "text-xs text-slate-400 mb-1", children: "\u0414\u0430\u0442\u0430 \u0432\u044B\u0445\u043E\u0434\u0430 (\u0435\u0441\u043B\u0438 hired)" }), _jsx(Input, { type: "date", value: addForm.start_date, onChange: (e) => setAddForm((f) => ({ ...f, start_date: e.target.value })) })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "checkbox", checked: addForm.paid, onChange: (e) => {
                                                            const paid = e.target.checked;
                                                            setAddForm((f) => ({
                                                                ...f,
                                                                paid,
                                                                payment_amount: paid ? Number(selectedVacancy?.fee_amount || 0) : 0,
                                                            }));
                                                        }, className: "h-4 w-4" }), _jsx("span", { className: "text-sm text-slate-200", children: "\u0421\u0440\u0430\u0437\u0443 \u0434\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043F\u0435\u0440\u0432\u044B\u0439 \u043F\u043B\u0430\u0442\u0435\u0436" })] }), _jsxs("div", { children: [_jsx("div", { className: "text-xs text-slate-400 mb-1", children: "\u0414\u0430\u0442\u0430 \u043F\u043B\u0430\u0442\u0435\u0436\u0430" }), _jsx(Input, { type: "date", value: addForm.paid_date, onChange: (e) => setAddForm((f) => ({ ...f, paid_date: e.target.value })) })] }), _jsxs("div", { children: [_jsx("div", { className: "text-xs text-slate-400 mb-1", children: "\u0421\u0443\u043C\u043C\u0430 \u043F\u043B\u0430\u0442\u0435\u0436\u0430 (\u0430\u0432\u0442\u043E \u0438\u0437 fee)" }), _jsx(Input, { type: "number", value: addForm.payment_amount, onChange: (e) => setAddForm((f) => ({ ...f, payment_amount: Number(e.target.value) })) })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "checkbox", checked: addForm.is_replacement, onChange: (e) => setAddForm((f) => ({ ...f, is_replacement: e.target.checked })), className: "h-4 w-4" }), _jsx("span", { className: "text-sm text-slate-200", children: "\u042D\u0442\u043E \u0437\u0430\u043C\u0435\u043D\u0430" })] }), _jsxs("div", { children: [_jsx("div", { className: "text-xs text-slate-400 mb-1", children: "\u0417\u0430\u043C\u0435\u043D\u0430 \u043A\u043E\u0433\u043E (\u0438\u0437 \u0441\u043F\u0438\u0441\u043A\u0430)" }), _jsxs(Select, { value: addForm.replacement_of_id, onChange: (e) => setAddForm((f) => ({ ...f, replacement_of_id: e.target.value ? Number(e.target.value) : "" })), disabled: !addForm.is_replacement, children: [_jsx("option", { value: "", children: "\u0412\u044B\u0431\u0440\u0430\u0442\u044C" }), replacementOptions.map((r) => (_jsxs("option", { value: r.id, children: ["#", r.id, " | ", r.candidate_name, " | ", r.client_name, " | ", r.vacancy_title] }, r.id)))] })] }), _jsxs("div", { className: "md:col-span-2", children: [_jsx("div", { className: "text-xs text-slate-400 mb-1", children: "\u041A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439 \u043F\u043E \u0437\u0430\u043C\u0435\u043D\u0435" }), _jsx(Input, { value: addForm.replacement_note, onChange: (e) => setAddForm((f) => ({ ...f, replacement_note: e.target.value })) })] })] }), _jsxs("div", { className: "mt-4 flex justify-end gap-2", children: [_jsx(Button, { variant: "ghost", onClick: () => setOpenAddApp(false), children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx(Button, { onClick: submitAddApplication, disabled: loading, children: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C" })] })] }), _jsx(Modal, { open: !!openEditApp, title: openEditApp ? `Редактировать: ${openEditApp.candidate_name}` : "Редактировать", onClose: () => setOpenEditApp(null), children: openEditApp && (_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("div", { className: "text-xs text-slate-400 mb-1", children: "\u0421\u0442\u0430\u0442\u0443\u0441" }), _jsxs(Select, { value: openEditApp.status, onChange: (e) => setOpenEditApp({ ...openEditApp, status: e.target.value }), children: [_jsx("option", { value: "new", children: "new" }), _jsx("option", { value: "in_process", children: "in_process" }), _jsx("option", { value: "rejected", children: "rejected" }), _jsx("option", { value: "hired", children: "hired" })] })] }), _jsxs("div", { children: [_jsx("div", { className: "text-xs text-slate-400 mb-1", children: "\u0414\u0430\u0442\u0430 \u043E\u0431\u0449\u0435\u043D\u0438\u044F" }), _jsx(Input, { type: "date", value: openEditApp.date_contacted, onChange: (e) => setOpenEditApp({ ...openEditApp, date_contacted: e.target.value }) })] }), _jsxs("div", { children: [_jsx("div", { className: "text-xs text-slate-400 mb-1", children: "\u0414\u0430\u0442\u0430 \u043E\u0442\u043A\u0430\u0437\u0430" }), _jsx(Input, { type: "date", value: openEditApp.rejection_date ?? "", onChange: (e) => setOpenEditApp({ ...openEditApp, rejection_date: e.target.value || null }) })] }), _jsxs("div", { children: [_jsx("div", { className: "text-xs text-slate-400 mb-1", children: "\u0414\u0430\u0442\u0430 \u0432\u044B\u0445\u043E\u0434\u0430" }), _jsx(Input, { type: "date", value: openEditApp.start_date ?? "", onChange: (e) => setOpenEditApp({ ...openEditApp, start_date: e.target.value || null }) })] }), _jsxs("div", { className: "md:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-3", children: [_jsx("div", { className: "flex flex-col md:flex-row md:items-center md:justify-between gap-2", children: _jsxs("div", { children: [_jsx("div", { className: "text-sm font-semibold", children: "\u041F\u043B\u0430\u0442\u0435\u0436\u0438" }), _jsxs("div", { className: "text-xs text-slate-400", children: ["\u043E\u043F\u043B\u0430\u0447\u0435\u043D\u043E: ", openEditApp.payment_amount, " | \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u044F\u044F \u0434\u0430\u0442\u0430: ", openEditApp.paid_date ?? "-"] })] }) }), _jsxs("div", { className: "mt-3 grid grid-cols-1 md:grid-cols-3 gap-2", children: [_jsxs("div", { children: [_jsx("div", { className: "text-xs text-slate-400 mb-1", children: "\u0414\u0430\u0442\u0430" }), _jsx(Input, { type: "date", value: payForm.paid_date, onChange: (e) => setPayForm((f) => ({ ...f, paid_date: e.target.value })) })] }), _jsxs("div", { children: [_jsx("div", { className: "text-xs text-slate-400 mb-1", children: "\u0421\u0443\u043C\u043C\u0430" }), _jsx(Input, { type: "number", value: payForm.amount, onChange: (e) => setPayForm((f) => ({ ...f, amount: Number(e.target.value) })) })] }), _jsxs("div", { children: [_jsx("div", { className: "text-xs text-slate-400 mb-1", children: "\u041A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439" }), _jsx(Input, { value: payForm.note, onChange: (e) => setPayForm((f) => ({ ...f, note: e.target.value })) })] }), _jsx("div", { className: "md:col-span-3 flex justify-end", children: _jsx(Button, { onClick: addPaymentToCurrent, disabled: loading, children: "+ \u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043F\u043B\u0430\u0442\u0435\u0436" }) })] }), _jsx("div", { className: "mt-3 overflow-auto rounded-2xl border border-white/10", children: _jsxs("table", { className: "min-w-full text-sm", children: [_jsx("thead", { className: "bg-white/5 text-slate-300", children: _jsxs("tr", { children: [_jsx("th", { className: "text-left p-2", children: "\u0414\u0430\u0442\u0430" }), _jsx("th", { className: "text-left p-2", children: "\u0421\u0443\u043C\u043C\u0430" }), _jsx("th", { className: "text-left p-2", children: "\u041A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439" }), _jsx("th", { className: "text-left p-2" })] }) }), _jsxs("tbody", { children: [payments.map((p) => (_jsxs("tr", { className: "border-t border-white/10 hover:bg-white/5", children: [_jsx("td", { className: "p-2", children: p.paid_date }), _jsx("td", { className: "p-2 font-medium", children: p.amount }), _jsx("td", { className: "p-2", children: p.note ?? "" }), _jsx("td", { className: "p-2 text-right", children: _jsx(Button, { variant: "danger", onClick: () => deletePayment(p.id), disabled: loading, children: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C" }) })] }, p.id))), payments.length === 0 && (_jsx("tr", { children: _jsx("td", { className: "p-3 text-slate-400", colSpan: 4, children: "\u041F\u043B\u0430\u0442\u0435\u0436\u0435\u0439 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442." }) }))] })] }) })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "checkbox", checked: openEditApp.is_replacement, onChange: (e) => setOpenEditApp({ ...openEditApp, is_replacement: e.target.checked }), className: "h-4 w-4" }), _jsx("span", { className: "text-sm text-slate-200", children: "\u042D\u0442\u043E \u0437\u0430\u043C\u0435\u043D\u0430" })] }), _jsxs("div", { children: [_jsx("div", { className: "text-xs text-slate-400 mb-1", children: "\u0417\u0430\u043C\u0435\u043D\u0430 \u043A\u043E\u0433\u043E" }), _jsxs(Select, { value: openEditApp.replacement_of_id ?? "", onChange: (e) => setOpenEditApp({ ...openEditApp, replacement_of_id: e.target.value ? Number(e.target.value) : null }), disabled: !openEditApp.is_replacement, children: [_jsx("option", { value: "", children: "\u0412\u044B\u0431\u0440\u0430\u0442\u044C" }), replacementOptions.map((r) => (_jsxs("option", { value: r.id, children: ["#", r.id, " | ", r.candidate_name, " | ", r.client_name, " | ", r.vacancy_title] }, r.id)))] })] }), _jsxs("div", { className: "md:col-span-2", children: [_jsx("div", { className: "text-xs text-slate-400 mb-1", children: "\u041A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439 \u043F\u043E \u0437\u0430\u043C\u0435\u043D\u0435" }), _jsx(Input, { value: openEditApp.replacement_note ?? "", onChange: (e) => setOpenEditApp({ ...openEditApp, replacement_note: e.target.value || null }) })] }), _jsxs("div", { className: "md:col-span-2 flex justify-end gap-2 mt-2", children: [_jsx(Button, { variant: "ghost", onClick: () => setOpenEditApp(null), children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx(Button, { onClick: () => saveEditApplication(openEditApp), disabled: loading, children: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C" })] })] })) })] })), tab === "Клиенты" && (_jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/5 p-4", children: [_jsxs("div", { className: "flex items-end gap-2", children: [_jsxs("div", { className: "flex-1", children: [_jsx("div", { className: "text-xs text-slate-400 mb-1", children: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043A\u043B\u0438\u0435\u043D\u0442\u0430" }), _jsx(Input, { value: newClientName, onChange: (e) => setNewClientName(e.target.value), placeholder: "\u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440: Acme Corp" })] }), _jsx(Button, { onClick: addClient, disabled: loading, children: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C" })] }), _jsx("div", { className: "mt-4 grid grid-cols-1 md:grid-cols-3 gap-3", children: clients.map((c) => (_jsxs("div", { className: "rounded-2xl border border-white/10 bg-slate-900/40 p-4 flex items-center justify-between", children: [_jsx("div", { className: "font-medium", children: c.name }), _jsx(Button, { variant: "danger", onClick: () => api.deleteClient(c.id).then(refreshAll), disabled: loading, children: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C" })] }, c.id))) })] })), tab === "Рекрутеры" && (_jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/5 p-4", children: [_jsxs("div", { className: "flex items-end gap-2", children: [_jsxs("div", { className: "flex-1", children: [_jsx("div", { className: "text-xs text-slate-400 mb-1", children: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0440\u0435\u043A\u0440\u0443\u0442\u0435\u0440\u0430" }), _jsx(Input, { value: newRecruiterName, onChange: (e) => setNewRecruiterName(e.target.value), placeholder: "\u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440: Kim" })] }), _jsx(Button, { onClick: addRecruiter, disabled: loading, children: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C" })] }), _jsx("div", { className: "mt-4 grid grid-cols-1 md:grid-cols-3 gap-3", children: recruiters.map((r) => (_jsxs("div", { className: "rounded-2xl border border-white/10 bg-slate-900/40 p-4 flex items-center justify-between", children: [_jsx("div", { className: "font-medium", children: r.name }), _jsx(Button, { variant: "danger", onClick: () => api.deleteRecruiter(r.id).then(refreshAll), disabled: loading, children: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C" })] }, r.id))) })] })), tab === "Вакансии" && (_jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/5 p-4", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-3 items-end", children: [_jsxs("div", { children: [_jsx("div", { className: "text-xs text-slate-400 mb-1", children: "\u041A\u043B\u0438\u0435\u043D\u0442" }), _jsxs(Select, { value: newVacancyClientId, onChange: (e) => setNewVacancyClientId(e.target.value ? Number(e.target.value) : ""), children: [_jsx("option", { value: "", children: "\u0412\u044B\u0431\u0440\u0430\u0442\u044C" }), clients.map((c) => (_jsx("option", { value: c.id, children: c.name }, c.id)))] })] }), _jsxs("div", { className: "md:col-span-2", children: [_jsx("div", { className: "text-xs text-slate-400 mb-1", children: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0438" }), _jsx(Input, { value: newVacancyTitle, onChange: (e) => setNewVacancyTitle(e.target.value), placeholder: "\u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440: Senior Python Developer" })] }), _jsxs("div", { children: [_jsx("div", { className: "text-xs text-slate-400 mb-1", children: "Fee (\u0441\u0442\u0430\u0432\u043A\u0430)" }), _jsx(Input, { type: "number", value: newVacancyFee, onChange: (e) => setNewVacancyFee(Number(e.target.value)) })] }), _jsx("div", { className: "md:col-span-4 flex justify-end", children: _jsx(Button, { onClick: addVacancy, disabled: loading, children: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u044E" }) })] }), _jsx("div", { className: "mt-4 overflow-auto rounded-2xl border border-white/10", children: _jsxs("table", { className: "min-w-full text-sm", children: [_jsx("thead", { className: "bg-white/5 text-slate-300", children: _jsxs("tr", { children: [_jsx("th", { className: "text-left p-3", children: "\u041A\u043B\u0438\u0435\u043D\u0442" }), _jsx("th", { className: "text-left p-3", children: "\u0412\u0430\u043A\u0430\u043D\u0441\u0438\u044F" }), _jsx("th", { className: "text-left p-3", children: "Fee" }), _jsx("th", { className: "text-left p-3" })] }) }), _jsxs("tbody", { children: [vacancies.map((v) => (_jsxs("tr", { className: "border-t border-white/10 hover:bg-white/5", children: [_jsx("td", { className: "p-3", children: clients.find((c) => c.id === v.client_id)?.name ?? v.client_id }), _jsx("td", { className: "p-3 font-medium", children: v.title }), _jsx("td", { className: "p-3", children: v.fee_amount }), _jsx("td", { className: "p-3 text-right", children: _jsx(Button, { variant: "danger", onClick: () => api.deleteVacancy(v.id).then(refreshAll), disabled: loading, children: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C" }) })] }, v.id))), vacancies.length === 0 && (_jsx("tr", { children: _jsx("td", { className: "p-5 text-slate-400", colSpan: 4, children: "\u0414\u043E\u0431\u0430\u0432\u044C \u043F\u0435\u0440\u0432\u0443\u044E \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u044E." }) }))] })] }) })] })), tab === "Отчеты" && (_jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/5 p-4", children: [_jsxs("div", { className: "flex flex-col md:flex-row md:items-end gap-3 justify-between", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-3", children: [_jsxs("div", { children: [_jsx("div", { className: "text-xs text-slate-400 mb-1", children: "\u0413\u043E\u0434" }), _jsx(Input, { type: "number", value: repYear, onChange: (e) => setRepYear(Number(e.target.value)) })] }), _jsxs("div", { children: [_jsx("div", { className: "text-xs text-slate-400 mb-1", children: "\u041C\u0435\u0441\u044F\u0446" }), _jsx(Input, { type: "number", value: repMonth, onChange: (e) => setRepMonth(Number(e.target.value)) })] }), _jsx("div", { className: "flex items-end", children: _jsx(Button, { onClick: loadReport, disabled: loading, children: "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C" }) }), _jsx("div", { className: "flex items-end", children: _jsx(Button, { variant: "ghost", onClick: () => {
                                                        downloadCSV(`earnings_${repYear}-${String(repMonth).padStart(2, "0")}.csv`, repItems.map((it) => ({
                                                            paid_date: it.paid_date,
                                                            amount: it.amount,
                                                            candidate: it.candidate_name,
                                                            client: it.client_name,
                                                            vacancy: it.vacancy_title,
                                                            recruiter: it.recruiter_name,
                                                            application_id: it.application_id,
                                                            payment_id: it.payment_id,
                                                        })));
                                                    }, children: "\u042D\u043A\u0441\u043F\u043E\u0440\u0442 CSV" }) })] }), _jsxs("div", { className: "text-right", children: [_jsx("div", { className: "text-xs text-slate-400", children: "\u0418\u0442\u043E\u0433\u043E \u0437\u0430 \u043C\u0435\u0441\u044F\u0446" }), _jsx("div", { className: "text-2xl font-semibold", children: repTotal ?? "-" })] })] }), _jsx("div", { className: "mt-4 overflow-auto rounded-2xl border border-white/10", children: _jsxs("table", { className: "min-w-full text-sm", children: [_jsx("thead", { className: "bg-white/5 text-slate-300", children: _jsxs("tr", { children: [_jsx("th", { className: "text-left p-3", children: "\u0414\u0430\u0442\u0430 \u043E\u043F\u043B\u0430\u0442\u044B" }), _jsx("th", { className: "text-left p-3", children: "\u0421\u0443\u043C\u043C\u0430" }), _jsx("th", { className: "text-left p-3", children: "\u041A\u0430\u043D\u0434\u0438\u0434\u0430\u0442" }), _jsx("th", { className: "text-left p-3", children: "\u041A\u043B\u0438\u0435\u043D\u0442" }), _jsx("th", { className: "text-left p-3", children: "\u0412\u0430\u043A\u0430\u043D\u0441\u0438\u044F" }), _jsx("th", { className: "text-left p-3", children: "\u0420\u0435\u043A\u0440\u0443\u0442\u0435\u0440" })] }) }), _jsxs("tbody", { children: [repItems.map((it, idx) => (_jsxs("tr", { className: "border-t border-white/10 hover:bg-white/5", children: [_jsx("td", { className: "p-3", children: it.paid_date }), _jsx("td", { className: "p-3 font-medium", children: it.amount }), _jsx("td", { className: "p-3", children: it.candidate_name }), _jsx("td", { className: "p-3", children: it.client_name }), _jsx("td", { className: "p-3", children: it.vacancy_title }), _jsx("td", { className: "p-3", children: it.recruiter_name })] }, idx))), repItems.length === 0 && (_jsx("tr", { children: _jsx("td", { className: "p-5 text-slate-400", colSpan: 6, children: "\u0417\u0430 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u044B\u0439 \u043C\u0435\u0441\u044F\u0446 \u043F\u043B\u0430\u0442\u0435\u0436\u0435\u0439 \u043D\u0435\u0442." }) }))] })] }) })] })), _jsx("div", { className: "mt-6 text-xs text-slate-500", children: "\u041B\u0430\u0439\u0444\u0445\u0430\u043A: \u043E\u043F\u043B\u0430\u0442\u0430 \u0442\u0435\u043F\u0435\u0440\u044C \u201C\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0430\u044F\u201D \u0447\u0435\u0440\u0435\u0437 \u043F\u043B\u0430\u0442\u0435\u0436\u0438, \u043C\u043E\u0436\u043D\u043E \u0440\u0430\u0437\u0431\u0438\u0432\u0430\u0442\u044C \u043D\u0430 \u0447\u0430\u0441\u0442\u0438. \u0412\u043E\u0440\u043E\u043D\u043A\u0430 \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442 \u0441\u0443\u043C\u043C\u0443 \u0432\u0441\u0435\u0445 \u043F\u043B\u0430\u0442\u0435\u0436\u0435\u0439 \u0438 \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u044E\u044E \u0434\u0430\u0442\u0443." })] })] }));
}
