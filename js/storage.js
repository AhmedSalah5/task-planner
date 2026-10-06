const STORAGE_KEY = "planner:data";

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { goals: [], tasks: [] };
  } catch (e) {
    return { goals: [], tasks: [] };
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// function addGoal(goal) {
//   const data = loadData();
//   const tasks = generateTasks(goal);
//   data.goals.push(goal);
//   data.tasks.push(...tasks);
//   saveData(data);
//   return tasks.length;
// }

function addGoal(goal) {
  const data = loadData();
  const tasks = goal.mode === "manual" ? [] : generateTasks(goal);
  data.goals.push(goal);
  data.tasks.push(...tasks);
  saveData(data);
  return tasks.length;
}

function toggleTask(id) {
  const data = loadData();
  const task = data.tasks.find((t) => t.id === id);
  if (task) {
    task.done = !task.done;
    saveData(data);
  }
}

function deleteGoal(id) {
  const data = loadData();
  data.goals = data.goals.filter((g) => g.id !== id);
  data.tasks = data.tasks.filter((t) => t.goalId !== id);
  saveData(data);
}

function clearAllData() {
  localStorage.removeItem(STORAGE_KEY);
}

// حذف المهام غير المنجزة لهدف ووضع المهام الجديدة (مع تمديد الموعد اختيارياً)
function applyReschedule(goalId, newTasks, newEndDate) {
  const data = loadData();
  const goal = data.goals.find((g) => g.id === goalId);
  if (!goal) return;
  if (newEndDate) goal.endDate = newEndDate;
  // نحتفظ بالمنجزة واليدوية، ونستبدل غير المنجزة التلقائية
  data.tasks = data.tasks.filter(
    (t) => t.goalId !== goalId || t.done || t.manual
  );
  data.tasks.push(...newTasks);
  syncGoal(data, goalId);
  saveData(data);
}

// مزامنة الهدف مع مهامه: الكمية الكلية = مجموع الكميات، والنهاية لا تسبق آخر مهمة
function syncGoal(data, goalId) {
  const goal = data.goals.find((g) => g.id === goalId);
  if (!goal) return;
  const list = data.tasks.filter((t) => t.goalId === goalId);
  goal.total = list.reduce((sum, t) => sum + t.amount, 0);
  goal.endDate = list.reduce((max, t) => (t.date > max ? t.date : max), goal.endDate);
}

// إضافة أو تحديث مهمة
function saveTask(task) {
  const data = loadData();
  const i = data.tasks.findIndex((t) => t.id === task.id);
  if (i >= 0) data.tasks[i] = task;
  else data.tasks.push(task);
  syncGoal(data, task.goalId);
  saveData(data);
}

function deleteTask(id) {
  const data = loadData();
  const task = data.tasks.find((t) => t.id === id);
  if (!task) return;
  data.tasks = data.tasks.filter((t) => t.id !== id);
  syncGoal(data, task.goalId);
  saveData(data);
}