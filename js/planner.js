// معرّف فريد (crypto.randomUUID لا يعمل على http غير آمن، مثل فتح الصفحة من الموبايل عبر IP الشبكة)
function uid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

function toISO(d) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function parseISO(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(d) {
  return d.toLocaleDateString("ar-EG", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

// الأيام المتاحة بين تاريخين مع استبعاد أيام معينة
function getAvailableDays(startDate, endDate, skipDays = []) {
  const days = [];
  const d = parseISO(startDate);
  const end = parseISO(endDate);
  while (d <= end) {
    if (!skipDays.includes(d.getDay())) days.push(toISO(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

// توزيع الكمية على الأيام (10 على 4 = 3,3,2,2)
function splitAmount(total, daysCount) {
  const base = Math.floor(total / daysCount);
  const extra = total % daysCount;
  return Array.from({ length: daysCount }, (_, i) => base + (i < extra ? 1 : 0));
}

// توليد المهام اليومية لهدف
// بناء مهام يومية لكمية معينة على أيام معينة
function buildTasks(goal, days, total) {
  if (days.length === 0 || total <= 0) return [];
  const amounts = splitAmount(total, days.length);
  return days
    .map((date, i) => ({
      id: uid(),
      goalId: goal.id,
      date,
      title: `${goal.title} - ${amounts[i]} ${goal.unit}`,
      amount: amounts[i],
      done: false,
      manual: false,
    }))
    .filter((t) => t.amount > 0);
}

function generateTasks(goal) {
  const days = getAvailableDays(goal.startDate, goal.endDate, goal.skipDays);
  return buildTasks(goal, days, goal.total);
}


// إحصائيات هدف واحد
function getGoalStats(goal, tasks, todayISO) {
  const goalTasks = tasks.filter((t) => t.goalId === goal.id);

  const doneAmount = goalTasks
    .filter((t) => t.done)
    .reduce((sum, t) => sum + t.amount, 0);

  const overdueAmount = goalTasks
    .filter((t) => !t.done && t.date < todayISO)
    .reduce((sum, t) => sum + t.amount, 0);

  const aheadExists = goalTasks.some((t) => t.done && t.date > todayISO);

  const percent = goal.total ? Math.min(100, Math.round((doneAmount / goal.total) * 100)) : 0;

  const msPerDay = 24 * 60 * 60 * 1000;
  const daysLeft = Math.round(
    (parseISO(goal.endDate) - parseISO(todayISO)) / msPerDay
  );

  let status = "ontrack";
  // if (doneAmount >= goal.total) status = "done";
  if (goal.total > 0 && doneAmount >= goal.total) status = "done";
  else if (overdueAmount > 0) status = "late";
  else if (goal.startDate > todayISO) status = "pending";
  else if (aheadExists) status = "ahead";

  return { doneAmount, overdueAmount, percent, daysLeft, status };
}

// نص الأيام المتبقية بالعربية
function daysLeftText(n) {
  if (n < 0) return "انتهى الموعد";
  if (n === 0) return "ينتهي اليوم";
  if (n === 1) return "متبقي يوم";
  if (n === 2) return "متبقي يومان";
  if (n <= 10) return `متبقي ${n} أيام`;
  return `متبقي ${n} يوماً`;
}

// خطة إعادة التوزيع: المتبقي + الأيام المتاحة من اليوم حتى النهاية
function planReschedule(goal, tasks, todayISO) {
  const remaining = tasks
    .filter((t) => t.goalId === goal.id && !t.done && !t.manual)
    .reduce((sum, t) => sum + t.amount, 0);

  const days =
    todayISO <= goal.endDate
      ? getAvailableDays(todayISO, goal.endDate, goal.skipDays)
      : [];
  return { remaining, days };
}