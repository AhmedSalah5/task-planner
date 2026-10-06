const $ = (id) => document.getElementById(id);

const form = $("goal-form");
const errorEl = $("error");
const goalsEl = $("goals");
const todayEl = $("today-list");
const tabButtons = document.querySelectorAll("[data-tab]");
const themeButtons = document.querySelectorAll("[data-theme]");

// ---------- التبويبات ----------
function showTab(name) {
  document.querySelectorAll(".screen").forEach((s) => {
    s.hidden = s.id !== `screen-${name}`;
  });
  tabButtons.forEach((b) => {
    b.dataset.active = String(b.dataset.tab === name);
  });
  window.scrollTo(0, 0);
}
tabButtons.forEach((b) =>
  b.addEventListener("click", () => showTab(b.dataset.tab))
);

// ---------- عنصر "فارغ" ----------
function emptyState(text) {
  const div = document.createElement("div");
  div.className =
    "rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400";
  div.textContent = text;
  return div;
}

// ---------- نموذج إضافة هدف ----------
// function resetForm() {
//   form.reset();
//   $("start").value = toISO(new Date());
//   $("unit").value = "درس";
//   $("total").value = 10;
// }

// resetForm();

// form.addEventListener("submit", (e) => {
//   e.preventDefault();
//   errorEl.textContent = "";

//   const goal = {
//     id: uid(),
//     title: $("title").value.trim(),
//     unit: $("unit").value.trim(),
//     total: Number($("total").value),
//     startDate: $("start").value,
//     endDate: $("end").value,
//     skipDays: $("skip-friday").checked ? [5] : [],
//     mode: "auto",
//     createdAt: Date.now(),
//   };

//   if (goal.endDate < goal.startDate) {
//     errorEl.textContent = "تاريخ النهاية قبل تاريخ البداية";
//     return;
//   }
//   if (getAvailableDays(goal.startDate, goal.endDate, goal.skipDays).length === 0) {
//     errorEl.textContent = "لا توجد أيام متاحة في هذه الفترة";
//     return;
//   }

//   addGoal(goal);
//   resetForm();
//   render();
// });

function updateModeFields() {
  const manual = $("mode").value === "manual";
  $("auto-fields").hidden = manual;
  $("skip-wrap").hidden = manual;
  $("total").required = !manual;
  $("unit").required = !manual;
}
$("mode").addEventListener("change", updateModeFields);

function resetForm() {
  form.reset();
  $("start").value = toISO(new Date());
  $("unit").value = "درس";
  $("total").value = 10;
  updateModeFields();
}
resetForm();

form.addEventListener("submit", (e) => {
  e.preventDefault();
  errorEl.textContent = "";
  const manual = $("mode").value === "manual";

  const goal = {
    id: uid(),
    title: $("title").value.trim(),
    unit: manual ? "مهمة" : $("unit").value.trim(),
    total: manual ? 0 : Number($("total").value),
    startDate: $("start").value,
    endDate: $("end").value,
    skipDays: !manual && $("skip-friday").checked ? [5] : [],
    mode: manual ? "manual" : "auto",
    createdAt: Date.now(),
  };

  if (goal.endDate < goal.startDate) {
    errorEl.textContent = "تاريخ النهاية قبل تاريخ البداية";
    return;
  }
  if (
    !manual &&
    getAvailableDays(goal.startDate, goal.endDate, goal.skipDays).length === 0
  ) {
    errorEl.textContent = "لا توجد أيام متاحة في هذه الفترة";
    return;
  }

  addGoal(goal);
  resetForm();
  render();
});


// ---------- نافذة إضافة/تعديل مهمة ----------
const dialog = $("task-dialog");
let editing = null; // { goal, task }

function taskLabel(goal, t) {
  if (goal.mode === "manual") {
    return `${goal.title} › ${t.title}${t.amount > 1 ? ` (${t.amount})` : ""}`;
  }
  return `${goal.title}: ${t.amount} ${goal.unit}`;
}

function openTaskDialog(goal, task) {
  editing = { goal, task };
  const manualGoal = goal.mode === "manual";
  $("task-dialog-title").textContent = task ? "تعديل المهمة" : "مهمة جديدة";
  $("task-title-wrap").hidden = !manualGoal;
  $("task-title").required = manualGoal;
  $("task-title").value = task ? task.title : "";
  $("task-date").value = task ? task.date : toISO(new Date());
  $("task-amount").value = task ? task.amount : 1;
  $("task-done").checked = task ? task.done : false;
  $("task-delete").hidden = !task;
  dialog.showModal();
}

$("task-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const { goal, task } = editing;
  const amount = Number($("task-amount").value);
  const manualGoal = goal.mode === "manual";

  saveTask({
    id: task ? task.id : uid(),
    goalId: goal.id,
    date: $("task-date").value,
    title: manualGoal
      ? $("task-title").value.trim()
      : `${goal.title} - ${amount} ${goal.unit}`,
    amount,
    done: $("task-done").checked,
    manual: true,
  });

  dialog.close();
  render();
});

$("task-cancel").addEventListener("click", () => dialog.close());

$("task-delete").addEventListener("click", () => {
  if (confirm("حذف هذه المهمة؟")) {
    deleteTask(editing.task.id);
    dialog.close();
    render();
  }
});

// ---------- شاشة اليوم ----------
function renderToday() {
  const { goals, tasks } = loadData();
  const now = new Date();
  const today = toISO(now);
  const todayTasks = tasks.filter((t) => t.date === today);

  $("today-date").textContent = formatDate(now);
  todayEl.innerHTML = "";


  const lateGoals = goals.filter(
    (g) => getGoalStats(g, tasks, today).status === "late"
  );
  if (lateGoals.length) {
    const banner = document.createElement("button");
    banner.type = "button";
    banner.className =
      "mb-4 w-full rounded-2xl bg-red-50 p-4 text-start text-sm font-medium text-red-700 ring-1 ring-red-200 dark:bg-red-950 dark:text-red-300 dark:ring-red-900";
    banner.textContent = `⚠️ لديك مهام فائتة في ${lateGoals.length} هدف. اضغط لإعادة التوزيع.`;
    banner.addEventListener("click", () => showTab("goals"));
    todayEl.appendChild(banner);
  }

  const doneCount = todayTasks.filter((t) => t.done).length;
  const pct = todayTasks.length ? Math.round((doneCount / todayTasks.length) * 100) : 0;
  $("progress-bar").style.width = pct + "%";
  $("progress-text").textContent = todayTasks.length
    ? `${doneCount} من ${todayTasks.length} منجزة (${pct}%)`
    : "لا مهام اليوم";

  if (todayTasks.length === 0) {
    todayEl.appendChild(emptyState("🎉 لا توجد مهام لليوم"));
    return;
  }

  todayTasks.forEach((t) => {
    const goal = goals.find((g) => g.id === t.goalId);

    const label = document.createElement("label");
    label.className =
      "mb-2.5 flex min-h-[56px] cursor-pointer items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = t.done;
    cb.className = "size-6 shrink-0 accent-indigo-600";
    cb.addEventListener("change", () => {
      toggleTask(t.id);
      render();
    });

    const span = document.createElement("span");
    span.className = t.done
      ? "text-slate-400 line-through dark:text-slate-500"
      : "font-medium";
    span.textContent = goal ? taskLabel(goal, t) : t.title;
    // span.textContent = goal ? `${goal.title}: ${t.amount} ${goal.unit}` : t.title;


    label.append(cb, span);
    todayEl.appendChild(label);
  });
}

const STATUS = {
  done: { text: "مكتمل", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  late: { text: "متأخر", cls: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" },
  ahead: { text: "متقدم", cls: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300" },
  ontrack: { text: "في الموعد", cls: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" },
  pending: { text: "لم يبدأ", cls: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300" },
};

function handleReschedule(goalId) {
  const { goals, tasks } = loadData();
  const goal = goals.find((g) => g.id === goalId);
  if (!goal) return;

  const today = toISO(new Date());
  const { remaining, days } = planReschedule(goal, tasks, today);
  if (remaining === 0) {
    alert("لا توجد مهام تلقائية قابلة لإعادة التوزيع. عدّل مواعيد المهام يدوياً.");
    return;
  }
  let useDays = days;
  let newEnd = null;

  // انتهى الموعد: نطلب تاريخ نهاية جديداً
  if (useDays.length === 0) {
    const input = prompt(
      "انتهى الموعد ولا توجد أيام متاحة. أدخل تاريخ نهاية جديداً بصيغة YYYY-MM-DD:"
    );
    if (!input) return;
    const value = input.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < today) {
      alert("تاريخ غير صالح");
      return;
    }
    useDays = getAvailableDays(today, value, goal.skipDays);
    if (useDays.length === 0) {
      alert("لا توجد أيام متاحة حتى هذا التاريخ");
      return;
    }
    newEnd = value;
  }

  const perDay = Math.ceil(remaining / useDays.length);
  const ok = confirm(
    `سيُوزَّع المتبقي (${remaining} ${goal.unit}) على ${useDays.length} يوم، بحد أقصى ${perDay} ${goal.unit} يومياً. متابعة؟`
  );
  if (!ok) return;

  applyReschedule(goal.id, buildTasks(goal, useDays, remaining), newEnd);
  render();
}

// ---------- شاشة الأهداف ----------
function renderGoals() {
  const { goals, tasks } = loadData();
  const today = toISO(new Date());
  goalsEl.innerHTML = "";

  if (goals.length === 0) {
    goalsEl.appendChild(emptyState("لا توجد أهداف بعد. أضف أول هدف من النموذج أعلاه."));
    return;
  }

  goals.forEach((goal) => {
    const stats = getGoalStats(goal, tasks, today);
    const st = STATUS[stats.status];

    const card = document.createElement("section");
    card.className = "card";

    // الرأس
    const head = document.createElement("div");
    head.className = "flex items-start justify-between gap-3";
    const info = document.createElement("div");
    const h3 = document.createElement("h3");
    h3.className = "text-lg font-bold";
    h3.textContent = goal.title;
    const range = document.createElement("small");
    range.className = "text-sm text-slate-500 dark:text-slate-400";
    range.textContent = `${goal.startDate} ← ${goal.endDate}${goal.mode === "manual" ? " · يدوي" : ""}`;
    info.append(h3, range);

    const del = document.createElement("button");
    del.type = "button";
    del.className = "rounded-lg p-2 text-lg hover:bg-red-50 dark:hover:bg-red-950";
    del.setAttribute("aria-label", "حذف الهدف");
    del.textContent = "🗑";
    del.addEventListener("click", () => {
      if (confirm("حذف هذا الهدف وكل مهامه؟")) {
        deleteGoal(goal.id);
        render();
      }
    });
    head.append(info, del);

    // الحالة
    const meta = document.createElement("div");
    meta.className = "mt-3 flex flex-wrap items-center gap-2 text-sm";
    const badge = document.createElement("span");
    badge.className = "rounded-full px-3 py-1 text-xs font-bold " + st.cls;
    badge.textContent = st.text;
    const left = document.createElement("span");
    left.className = "text-slate-500 dark:text-slate-400";
    left.textContent = stats.status === "done" ? "" : daysLeftText(stats.daysLeft);
    meta.append(badge, left);

    if (stats.status === "late") {
      const late = document.createElement("span");
      late.className = "text-red-600 dark:text-red-400";
      late.textContent = `فاتك ${stats.overdueAmount} ${goal.unit}`;
      meta.appendChild(late);
    }

    card.append(head, meta);

    // إعادة التوزيع: للأهداف التلقائية فقط
    if (goal.mode === "auto" && (stats.status === "late" || stats.status === "ahead")) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "mt-3 w-full rounded-xl border border-indigo-300 p-2.5 text-sm font-semibold text-indigo-700 transition active:scale-[.98] dark:border-indigo-700 dark:text-indigo-300";
      btn.textContent = "🔄 إعادة توزيع المتبقي";
      btn.addEventListener("click", () => handleReschedule(goal.id));
      card.appendChild(btn);
    }

    // شريط التقدم
    const bar = document.createElement("div");
    bar.className = "mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700";
    const fill = document.createElement("div");
    fill.className = "h-full rounded-full bg-indigo-600 transition-[width] duration-500";
    fill.style.width = stats.percent + "%";
    bar.appendChild(fill);

    const amountText = document.createElement("p");
    amountText.className = "mt-1.5 text-sm text-slate-600 dark:text-slate-300";
    amountText.textContent = `${stats.doneAmount} من ${goal.total} ${goal.unit} (${stats.percent}%)`;

    // قائمة الأيام (كل صف قابل للتعديل)
    const ul = document.createElement("ul");
    ul.className = "mt-3 space-y-1 border-t border-slate-100 pt-3 text-sm dark:border-slate-700";
    tasks
      .filter((t) => t.goalId === goal.id)
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach((t) => {
        const li = document.createElement("li");
        const row = document.createElement("button");
        row.type = "button";
        row.className =
          "flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-start hover:bg-slate-50 dark:hover:bg-slate-700 " +
          (t.done
            ? "text-slate-400 line-through dark:text-slate-500"
            : "text-slate-700 dark:text-slate-200");

        const text = document.createElement("span");
        const body =
          goal.mode === "manual"
            ? `${t.title}${t.amount > 1 ? ` (${t.amount})` : ""}`
            : `${t.amount} ${goal.unit}`;
        text.textContent = `${t.done ? "✓" : "•"} ${t.date}: ${body}`;

        const edit = document.createElement("span");
        edit.className = "text-slate-400";
        edit.textContent = "✎";

        row.append(text, edit);
        row.addEventListener("click", () => openTaskDialog(goal, t));
        li.appendChild(row);
        ul.appendChild(li);
      });

    // زر إضافة مهمة
    const add = document.createElement("button");
    add.type = "button";
    add.className =
      "mt-3 w-full rounded-xl border border-dashed border-slate-300 p-2.5 text-sm font-semibold text-slate-600 dark:border-slate-600 dark:text-slate-300";
    add.textContent = "＋ إضافة مهمة";
    add.addEventListener("click", () => openTaskDialog(goal, null));

    card.append(bar, amountText, ul, add);
    goalsEl.appendChild(card);
  });
}

// ---------- شاشة الإعدادات ----------
function renderSettings() {
  const { theme } = loadSettings();
  themeButtons.forEach((b) => {
    b.dataset.active = String(b.dataset.theme === theme);
  });
}

themeButtons.forEach((b) =>
  b.addEventListener("click", () => {
    const settings = { ...loadSettings(), theme: b.dataset.theme };
    saveSettings(settings);
    applyTheme(settings.theme);
    renderSettings();
  })
);

$("clear-data").addEventListener("click", () => {
  if (confirm("سيتم حذف كل الأهداف والمهام نهائياً. متأكد؟")) {
    clearAllData();
    render();
  }
});

// ---------- الرسم العام ----------
function render() {
  renderToday();
  renderGoals();
  renderSettings();
}

render();