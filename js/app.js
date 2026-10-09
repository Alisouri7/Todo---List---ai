/**
 * Todo List Pro - Professional JavaScript
 * Enhanced with modern features and better UX
 */

// DOM Elements
const $ = document;
const inputElem = $.getElementById('itemInput');
const addButton = $.getElementById('addButton');
const clearButton = $.getElementById('clearButton');
const emptyMessageElem = $.getElementById('emptyMessage');
const todoListElem = $.getElementById('todoList');

// Timer UI Elements
const timerEnabledElem = $.getElementById('timerEnabled');
const timerInputRowElem = $.getElementById('timerInputRow');
const timerValueElem = $.getElementById('timerValue');
const timerUnitElem = $.getElementById('timerUnit');

// Time Elements
const hourElem = $.getElementById('hour');
const minuteElem = $.getElementById('minute');
const secondElem = $.getElementById('seconds');
const currentDateElem = $.getElementById('currentDate');
const currentYearElem = $.getElementById('currentYear');

// Statistics Elements
const taskCountElem = $.getElementById('taskCount');
const totalTasksElem = $.getElementById('totalTasks');
const activeTasksElem = $.getElementById('activeTasks');
const completedTasksElem = $.getElementById('completedTasks');

// Filter Buttons
const filterButtons = $.querySelectorAll('.filter-btn');

// Search & Filter Elements
const searchInput = $.getElementById('searchInput');
const priorityFilter = $.getElementById('priorityFilter');
const dateFilter = $.getElementById('dateFilter');
const tagFilter = $.getElementById('tagFilter');

// Priority Selector Buttons
const priorityButtons = $.querySelectorAll('.priority-btn');

// Tag & Due Date Inputs
const tagInput = $.getElementById('tagInput');
const dueDateInput = $.getElementById('dueDateInput');
const calendarTypeInput = $.getElementById('calendarTypeInput');

// Theme Elements
const themeToggleBtn = $.getElementById('themeToggle');
const themeIcon = themeToggleBtn?.querySelector('.theme-icon');

// State
let todosArray = [];
let currentFilter = 'all';
let currentPriority = 'medium';
let searchQuery = '';
let priorityFilterValue = 'all';
let dateFilterValue = 'all';
let tagFilterValue = 'all';

// Throttle function - limits execution to once per interval
function throttle(func, limit) {
    let inThrottle = false;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => {
                inThrottle = false;
            }, limit);
        }
    };
}

// Create throttled versions once
const throttledAddNewTodo = throttle(addNewTodo, 2000);
const throttledClearTodos = throttle(clearTodos, 2000);

// Wrapper for add new todo that bypasses throttle when input has content
function throttledAddNewTodoWrapper() {
    if (inputElem.value.trim() !== '') {
        addNewTodo();
    } else {
        throttledAddNewTodo();
    }
}

const throttledAddNewTodoInput = throttledAddNewTodoWrapper;

// Theme State
let currentTheme = 'light';
let isUserOverride = false;
const THEME_STORAGE_KEY = 'todo-theme';

// Initialize date picker based on calendar type
function initializeDatePicker() {
    const calendarType = calendarTypeInput ? calendarTypeInput.value : 'gregorian';
    
    if (typeof $ === 'undefined' || !dueDateInput) return;
    
    // Destroy existing datepicker if any
    if (dueDateInput._datePicker) {
        dueDateInput._datePicker.destroy();
        dueDateInput._datePicker = null;
    }
    
    // Remove any existing wrapper
    if (dueDateInput.parentElement.classList.contains('date-picker-wrapper')) {
        const wrapper = dueDateInput.parentElement;
        wrapper.parentNode.insertBefore(dueDateInput, wrapper);
        wrapper.parentNode.removeChild(wrapper);
    }
    
    dueDateInput.type = 'text';
    dueDateInput.setAttribute('placeholder', calendarType === 'jalali' ? 'مثال: 1405/07/17' : 'YYYY/MM/DD');
    dueDateInput.setAttribute('autocomplete', 'off');
    
    // Create new custom date picker
    dueDateInput._datePicker = new DatePicker(dueDateInput, calendarTypeInput, {
        onSelect: function(value, dateObj) {
            // Value is already set in input
            console.log('Date selected:', value, dateObj);
        }
    });
}

// Initialize application
function init() {
    // Update current year in footer
    currentYearElem.textContent = new Date().getFullYear();
    
    // Set initial button styles
    clearButton.classList.remove('btn');
    clearButton.classList.add('btn', 'btn-outline-danger');
    
    // Hide empty message initially
    emptyMessageElem.style.display = 'none';
    
    // Initialize theme
    initTheme();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize date display
    updateDateDisplay();
    
    // Initialize date picker
    initializeDatePicker();
    
    // Load todos from localStorage
    getLocalStorage();
    
    // Update statistics
    updateStatistics();
    
    // Set up filters
    setupFilters();
}

// Setup all event listeners
function setupEventListeners() {
    addButton.addEventListener('click', throttledAddNewTodoInput);
    clearButton.addEventListener('click', throttledClearTodos);
    inputElem.addEventListener('keydown', handleKeyDown);
    window.addEventListener('load', init);
    
    // Theme toggle event listeners
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
        themeToggleBtn.addEventListener('keydown', handleToggleKeydown);
    }

    // Timer toggle: show/hide the timer input row
    if (timerEnabledElem) {
        timerEnabledElem.addEventListener('change', () => {
            const isChecked = timerEnabledElem.checked;
            timerInputRowElem.classList.toggle('visible', isChecked);
            timerInputRowElem.setAttribute('aria-hidden', String(!isChecked));
            if (isChecked) {
                timerValueElem.focus();
            }
        });
    }

    // Search input
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            searchQuery = searchInput.value.trim().toLowerCase();
            todosGenerator(todosArray);
        });
    }

    // Priority filter dropdown
    if (priorityFilter) {
        priorityFilter.addEventListener('change', () => {
            priorityFilterValue = priorityFilter.value;
            todosGenerator(todosArray);
        });
    }

    // Date filter dropdown
    if (dateFilter) {
        dateFilter.addEventListener('change', () => {
            dateFilterValue = dateFilter.value;
            todosGenerator(todosArray);
        });
    }

    // Tag filter dropdown
    if (tagFilter) {
        tagFilter.addEventListener('change', () => {
            tagFilterValue = tagFilter.value;
            todosGenerator(todosArray);
        });
    }

    // Priority selector buttons
    priorityButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            priorityButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPriority = btn.dataset.priority;
        });
    });

    // Calendar type selector — the DatePicker instance handles its own calendarTypeInput
    // change listener internally (see DatePicker.init()). Calling initializeDatePicker()
    // here would destroy/recreate the picker on every type switch, undoing the conversion
    // that the DatePicker's internal listener already performed correctly.
    // So we intentionally do NOT add a separate listener here.

}

// Setup filter functionality
function setupFilters() {
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            button.classList.add('active');
            
            // Update current filter
            currentFilter = button.dataset.filter;
            
            // Re-render todos with current filter
            todosGenerator(todosArray);
        });
    });
}

// Update tag filter dropdown with unique tags from all todos
function updateTagFilter() {
    if (!tagFilter) return;

    const tags = [...new Set(todosArray
        .map(todo => todo.tag)
        .filter(tag => tag !== '' && tag !== undefined && tag !== null)
    )];

    const currentValue = tagFilter.value;

    tagFilter.innerHTML = '<option value="all">All Tags</option>';
    tags.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag;
        option.textContent = tag;
        tagFilter.appendChild(option);
    });

    if (tags.includes(currentValue)) {
        tagFilter.value = currentValue;
        tagFilterValue = currentValue;
    } else {
        tagFilter.value = 'all';
        tagFilterValue = 'all';
    }
}

// Update date display (header clock date - always uses language setting)
function updateDateDisplay() {
    const now = new Date();
    
    if (currentLanguage === 'fa') {
        // Persian date
        try {
            const parts = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }).formatToParts(now);
            
            const partMap = {};
            parts.forEach(p => partMap[p.type] = p.value);
            
            currentDateElem.textContent = `${partMap.weekday}، ${partMap.day} ${partMap.month} ${partMap.year}`;
        } catch (e) {
            currentDateElem.textContent = toJalaliFallback(now);
        }
    } else {
        // Gregorian calendar
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        currentDateElem.textContent = now.toLocaleDateString('en-US', options);
    }
}

// Fallback Jalali conversion (for older browsers without Intl Persian calendar support)
function toJalaliFallback(gy) {
    const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    let gy2 = gy.getFullYear();
    let gm = gy.getMonth() + 1;
    let gd = gy.getDate();
    
    let jy;
    if (gy2 > 1600) {
        jy = 979;
        gy2 -= 1600;
    } else {
        jy = 0;
        gy2 -= 621;
    }
    
    let days = (365 * gy2) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400);
    
    if (gm > 12) gm = 12;
    
    days += g_d_m[gm - 1] + gd;
    
    if (gm > 2 && ((gy2 % 4 === 0 && gy2 % 100 !== 0) || (gy2 % 400 === 0))) {
        days++;
    }
    
    let j_day_no = days - 79;
    let j_np = Math.floor(j_day_no / 12053);
    j_day_no %= 12053;
    let jy2 = Math.floor(j_day_no / 365);
    j_day_no %= 365;
    
    let jm, jd;
    if (j_day_no >= 186) {
        jy2++;
        j_day_no -= 186;
        jm = Math.floor(j_day_no / 30) + 7;
        jd = (j_day_no % 30) + 1;
    } else {
        jm = Math.floor(j_day_no / 31) + 1;
        jd = (j_day_no % 31) + 1;
    }
    
    const weekdays = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'];
    const months = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
    const weekday = weekdays[gy.getDay()];
    
    return `${weekday}، ${jd} ${months[jm - 1]} ${jy + j_np * 33 + jy2}`;
}

// ============================================
// Custom Date Picker Implementation
// ============================================

// Gregorian to Jalali conversion - Fixed algorithm
function gregorianToJalali(gy, gm, gd) {
    // Algorithm from: https://github.com/jalaali/jalaali-js
    // Days in each Gregorian month
    const gDaysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    
    // Check leap year
    const gyLeap = (gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0);
    
    // Calculate days since epoch (March 21, 622 CE = 1 Farvardin 1 AP)
    // But we use a simpler approach: days since 1600/03/01
    // 1600/03/01 Gregorian = 979/01/01 Jalali
    
    // Days from 1600/03/01 to gy/gm/gd
    let days = 0;
    
    // Years from 1600 to gy-1
    for (let y = 1600; y < gy; y++) {
        days += ((y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0)) ? 366 : 365;
    }
    
    // Months in current year
    for (let m = 1; m < gm; m++) {
        days += gDaysInMonth[m - 1];
        if (m === 2 && gyLeap) days++;
    }
    
    // Days in current month
    days += gd - 1;
    
    // Now convert to Jalali
    // 1600/03/01 = 979/01/01
    // But we need to adjust because Jalali year starts at Farvardin (around March 21)
    
    // Simpler: Use the standard algorithm with correct epoch
    // Epoch: 1948320.5 = Julian Day Number for 1 Farvardin 1 (March 21, 622 CE)
    
    // Calculate Julian Day Number for Gregorian date
    const a = Math.floor((14 - gm) / 12);
    const y = gy + 4800 - a;
    const m = gm + 12 * a - 3;
    let jdn = gd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
    
    // Convert JDN to Jalali
    // JDN for 1 Farvardin 1 = 1948321
    const jdnOffset = jdn - 1948321;
    
    const jy33 = Math.floor(jdnOffset / 12053);  // 33-year cycles
    let jdnRemain = jdnOffset % 12053;
    
    const jy4 = Math.floor(jdnRemain / 1461);    // 4-year cycles (1461 days)
    jdnRemain %= 1461;
    
    let jy1 = Math.floor(jdnRemain / 365);
    if (jy1 === 4) jy1 = 3;  // Handle leap year boundary
    jdnRemain %= 365;
    
    const jy = jy33 * 33 + jy4 * 4 + jy1 + 1;  // Jalali year (starts from 1)
    
    // Month and day
    let jm, jd;
    if (jdnRemain < 186) {
        // First 6 months (31 days each)
        jm = Math.floor(jdnRemain / 31) + 1;
        jd = (jdnRemain % 31) + 1;
    } else {
        // Last 6 months (30 days each, except last)
        jdnRemain -= 186;
        jm = Math.floor(jdnRemain / 30) + 7;
        jd = (jdnRemain % 30) + 1;
    }
    
    return { year: jy, month: jm, day: jd };
}

// Jalali to Gregorian conversion - Fixed algorithm
function jalaliToGregorian(jy, jm, jd) {
    // Calculate JDN from Jalali date
    // JDN for 1 Farvardin 1 = 1948321
    let jdn = 1948321;
    
    // Add days for complete 33-year cycles
    const jy33 = Math.floor((jy - 1) / 33);
    jdn += jy33 * 12053;
    
    // Add days for complete 4-year cycles within the 33-year cycle
    let jyRemain = (jy - 1) % 33;
    const jy4 = Math.floor(jyRemain / 4);
    jdn += jy4 * 1461;
    
    // Add days for remaining years
    jyRemain %= 4;
    jdn += jyRemain * 365;
    if (jyRemain > 0) jdn++; // leap day
    
    // Add days for months
    if (jm <= 6) {
        jdn += (jm - 1) * 31;
    } else {
        jdn += 186 + (jm - 7) * 30;
    }
    
    // Add days
    jdn += jd - 1;
    
    // Convert JDN to Gregorian
    const a = jdn + 32044;
    const b = Math.floor((4 * a + 3) / 146097);
    const c = a - Math.floor((146097 * b) / 4);
    const d = Math.floor((4 * c + 3) / 1461);
    const e = c - Math.floor((1461 * d) / 4);
    const m = Math.floor((5 * e + 2) / 153);
    
    const gd = e - Math.floor((153 * m + 2) / 5) + 1;
    const gm = m + 3 - 12 * Math.floor(m / 10);
    const gy = 100 * b + d - 4800 + Math.floor(m / 10);
    
    return { year: gy, month: gm, day: gd };
}

// Get month days for Gregorian
function getGregorianMonthDays(year, month) {
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (month === 2) {
        const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
        return isLeap ? 29 : 28;
    }
    return daysInMonth[month - 1];
}

// Get month days for Jalali
function getJalaliMonthDays(year, month) {
    if (month <= 6) return 31;
    if (month <= 11) return 30;
    // Month 12 (Esfand) - check if leap year
    const isLeap = ((year % 33) % 4 === 0);
    return isLeap ? 30 : 29;
}

// Get weekday (0 = Saturday for Jalali, 0 = Sunday for Gregorian)
function getWeekday(year, month, day, calendarType) {
    if (calendarType === 'jalali') {
        const g = jalaliToGregorian(year, month, day);
        const jsWeekday = new Date(g.year, g.month - 1, g.day).getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
        // Convert to Saturday-based (0=Sat, 1=Sun, ..., 6=Fri)
        return (jsWeekday + 1) % 7;
    } else {
        return new Date(year, month - 1, day).getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    }
}

// Format date for input value
function formatDateForInput(year, month, day, calendarType) {
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}/${mm}/${dd}`;
}

// Parse date from input value
function parseDateFromInput(value, calendarType) {
    const parts = value.split('/');
    if (parts.length !== 3) return null;
    return {
        year: parseInt(parts[0], 10),
        month: parseInt(parts[1], 10),
        day: parseInt(parts[2], 10)
    };
}

// Get today's date in both calendars
function getTodayDate(calendarType) {
    const now = new Date();
    if (calendarType === 'jalali') {
        return gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
    } else {
        return {
            year: now.getFullYear(),
            month: now.getMonth() + 1,
            day: now.getDate()
        };
    }
}

// ============================================
// Custom Date Picker Class
// ============================================
class DatePicker {
    constructor(inputElement, calendarTypeInput, options = {}) {
        this.input = inputElement;
        this.calendarTypeInput = calendarTypeInput;
        this.calendarType = calendarTypeInput ? calendarTypeInput.value : 'gregorian';
        this.previousCalendarType = this.calendarType; // Track for conversion
        this.onSelect = options.onSelect || (() => {});
        this.panel = null;
        this.currentYear = null;
        this.currentMonth = null;
        this.selectedDate = null;
        this.isOpen = false;
        
        this.init();
    }
    
    init() {
        // Wrap input if not already wrapped
        if (!this.input.parentElement.classList.contains('date-picker-wrapper')) {
            this.wrapInput();
        }
        
        // Create panel
        this.createPanel();
        
        // Bind events
        this.bindEvents();
        
        // Listen for calendar type changes
        if (this.calendarTypeInput) {
            this.calendarTypeInput.addEventListener('change', () => {
                const oldCalendarType = this.calendarType;
                const newCalendarType = this.calendarTypeInput.value;
                
                if (oldCalendarType !== newCalendarType) {
                    this.previousCalendarType = oldCalendarType;
                    this.calendarType = newCalendarType;
                    
                    // Convert input value if exists
                    const inputValue = this.input.value.trim();
                    if (inputValue) {
                        const parsed = parseDateFromInput(inputValue, oldCalendarType);
                        if (parsed) {
                            if (oldCalendarType === 'jalali' && newCalendarType === 'gregorian') {
                                const g = jalaliToGregorian(parsed.year, parsed.month, parsed.day);
                                this.input.value = formatDateForInput(g.year, g.month, g.day, newCalendarType);
                                this.selectedDate = { year: g.year, month: g.month, day: g.day };
                            } else if (oldCalendarType === 'gregorian' && newCalendarType === 'jalali') {
                                const j = gregorianToJalali(parsed.year, parsed.month, parsed.day);
                                this.input.value = formatDateForInput(j.year, j.month, j.day, newCalendarType);
                                this.selectedDate = { year: j.year, month: j.month, day: j.day };
                            }
                        }
                    }
                    
                    // Convert current view date to new calendar type (panel open or closed)
                    this.convertCurrentDateToNewCalendar();
                    // Always sync previousCalendarType so updatePanel() never re-converts
                    this.previousCalendarType = newCalendarType;

                    // If panel is open, re-render with converted date
                    if (this.isOpen) {
                        this.updatePanel();
                    }
                }
            });
        }
    }
    
    wrapInput() {
        const wrapper = document.createElement('div');
        wrapper.className = 'date-picker-wrapper';
        this.input.parentNode.insertBefore(wrapper, this.input);
        wrapper.appendChild(this.input);
        
        // Add trigger button
        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'date-picker-trigger';
        trigger.innerHTML = '<i class="fas fa-calendar-alt"></i>';
        trigger.setAttribute('aria-label', 'Open date picker');
        wrapper.appendChild(trigger);
        
        this.input.classList.add('date-picker-input');
        this.wrapper = wrapper;
        this.trigger = trigger;
    }
    
    createPanel() {
        this.panel = document.createElement('div');
        this.panel.className = 'date-picker-panel';
        this.panel.setAttribute('role', 'dialog');
        this.panel.setAttribute('aria-label', 'Date picker');
        document.body.appendChild(this.panel);
    }
    
    bindEvents() {
        // Trigger click
        this.trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });
        
        // Input click
        this.input.addEventListener('click', (e) => {
            e.stopPropagation();
            this.open();
        });
        
        // Input focus
        this.input.addEventListener('focus', () => {
            this.open();
        });
        
        // Close on outside click
        document.addEventListener('click', (e) => {
            if (this.isOpen && !this.panel.contains(e.target) && e.target !== this.trigger && e.target !== this.input) {
                this.close();
            }
        });
        
        // Keyboard navigation
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.close();
                this.input.blur();
            }
        });
    }
    
    open() {
        if (this.isOpen) return;
        
        // Parse current value or use today
        const value = this.input.value.trim();
        if (value) {
            const parsed = parseDateFromInput(value, this.calendarType);
            if (parsed) {
                this.currentYear = parsed.year;
                this.currentMonth = parsed.month;
                this.selectedDate = parsed;
            }
        }
        
        // Default to today if no valid date
        if (!this.currentYear || !this.currentMonth) {
            const today = getTodayDate(this.calendarType);
            this.currentYear = today.year;
            this.currentMonth = today.month;
            this.selectedDate = today;
        }
        
        this.updatePanel();
        this.positionPanel();
        this.panel.classList.add('open');
        this.isOpen = true;
        
        // Focus first day button for accessibility
        setTimeout(() => {
            const todayBtn = this.panel.querySelector('.date-picker-day.today:not(.disabled)');
            const selectedBtn = this.panel.querySelector('.date-picker-day.selected');
            (selectedBtn || todayBtn || this.panel.querySelector('.date-picker-day:not(.disabled)'))?.focus();
        }, 50);
    }
    
    close() {
        if (!this.isOpen) return;
        this.panel.classList.remove('open');
        this.isOpen = false;
    }
    
    toggle() {
        if (this.isOpen) this.close();
        else this.open();
    }
    
    positionPanel() {
        const rect = this.wrapper.getBoundingClientRect();
        const panelRect = this.panel.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        let top = rect.bottom + window.scrollY + 6;
        let left = rect.left + window.scrollX;
        
        // Adjust if panel goes off screen
        if (left + panelRect.width > viewportWidth) {
            left = viewportWidth - panelRect.width - 10;
        }
        if (left < 10) left = 10;
        
        // Check if panel goes below viewport
        if (top + panelRect.height > viewportHeight + window.scrollY) {
            top = rect.top + window.scrollY - panelRect.height - 6;
        }
        
        this.panel.style.top = `${top}px`;
        this.panel.style.left = `${left}px`;
    }
    
    updatePanel() {
        const today = getTodayDate(this.calendarType);
        const daysInMonth = this.calendarType === 'jalali' 
            ? getJalaliMonthDays(this.currentYear, this.currentMonth)
            : getGregorianMonthDays(this.currentYear, this.currentMonth);
        
        const firstDayWeekday = getWeekday(this.currentYear, this.currentMonth, 1, this.calendarType);
        
        // Month names
        const monthNames = this.calendarType === 'jalali' 
            ? ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند']
            : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        
        // Weekday names (short)
        const weekdayNames = this.calendarType === 'jalali'
            ? ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']  // شنبه، یکشنبه، دوشنبه، سه‌شنبه، چهارشنبه، پنج‌شنبه، جمعه
            : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        // Adjust for RTL - in Persian, week starts from Saturday
        const adjustedWeekdays = this.calendarType === 'jalali' 
            ? ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']  // Already correct for Saturday start
            : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        let html = `
            <div class="date-picker-header">
                <button type="button" class="date-picker-nav-btn" data-action="prev-year" aria-label="Previous year">
                    <i class="fas fa-angle-double-left"></i>
                </button>
                <button type="button" class="date-picker-nav-btn" data-action="prev-month" aria-label="Previous month">
                    <i class="fas fa-angle-left"></i>
                </button>
                <div class="date-picker-title">${monthNames[this.currentMonth - 1]} ${this.currentYear}</div>
                <button type="button" class="date-picker-nav-btn" data-action="next-month" aria-label="Next month">
                    <i class="fas fa-angle-right"></i>
                </button>
                <button type="button" class="date-picker-nav-btn" data-action="next-year" aria-label="Next year">
                    <i class="fas fa-angle-double-right"></i>
                </button>
            </div>
            <div class="date-picker-weekdays">
                ${adjustedWeekdays.map(d => `<div>${d}</div>`).join('')}
            </div>
            <div class="date-picker-days">
        `;
        
        // Previous month days
        const prevMonth = this.currentMonth === 1 ? (this.calendarType === 'jalali' ? 12 : 12) : this.currentMonth - 1;
        const prevYear = this.currentMonth === 1 ? this.currentYear - 1 : this.currentYear;
        const prevMonthDays = this.calendarType === 'jalali' 
            ? getJalaliMonthDays(prevYear, prevMonth)
            : getGregorianMonthDays(prevYear, prevMonth);
        
        for (let i = firstDayWeekday - 1; i >= 0; i--) {
            const day = prevMonthDays - i;
            html += `<button type="button" class="date-picker-day other-month disabled" data-day="${day}" data-month="${prevMonth}" data-year="${prevYear}">${day}</button>`;
        }
        
        // Current month days
        for (let day = 1; day <= daysInMonth; day++) {
            const isToday = day === today.day && this.currentMonth === today.month && this.currentYear === today.year;
            const isSelected = this.selectedDate && day === this.selectedDate.day && this.currentMonth === this.selectedDate.month && this.currentYear === this.selectedDate.year;
            
            let classes = 'date-picker-day';
            if (isSelected) classes += ' selected';
            if (isToday && !isSelected) classes += ' today';
            
            html += `<button type="button" class="${classes}" data-day="${day}" data-month="${this.currentMonth}" data-year="${this.currentYear}" ${isSelected ? 'aria-selected="true"' : ''} ${isToday ? 'aria-current="date"' : ''}>${day}</button>`;
        }
        
        // Next month days to fill the grid
        const totalCells = firstDayWeekday + daysInMonth;
        const nextMonthCells = Math.ceil(totalCells / 7) * 7 - totalCells;
        
        for (let day = 1; day <= nextMonthCells; day++) {
            const nextMonth = this.currentMonth === (this.calendarType === 'jalali' ? 12 : 12) ? 1 : this.currentMonth + 1;
            const nextYear = this.currentMonth === (this.calendarType === 'jalali' ? 12 : 12) ? this.currentYear + 1 : this.currentYear;
            html += `<button type="button" class="date-picker-day other-month disabled" data-day="${day}" data-month="${nextMonth}" data-year="${nextYear}">${day}</button>`;
        }
        
        html += `
            </div>
            <div class="date-picker-footer">
                <button type="button" class="date-picker-today-btn" data-action="today">${this.calendarType === 'jalali' ? 'امروز' : 'Today'}</button>
                <button type="button" class="date-picker-clear-btn" data-action="clear">${this.calendarType === 'jalali' ? 'پاک کردن' : 'Clear'}</button>
            </div>
        `;
        
        this.panel.innerHTML = html;
        
        // Bind panel events
        this.bindPanelEvents();
    }
    
    bindPanelEvents() {
        // Day clicks
        this.panel.querySelectorAll('.date-picker-day:not(.disabled)').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const day = parseInt(e.target.dataset.day, 10);
                const month = parseInt(e.target.dataset.month, 10);
                const year = parseInt(e.target.dataset.year, 10);
                this.selectDate(year, month, day);
            });
            
            // Keyboard navigation
            btn.addEventListener('keydown', (e) => this.handleDayKeydown(e, btn));
        });
        
        // Navigation buttons
        this.panel.querySelectorAll('.date-picker-nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleNavigation(action);
            });
        });
        
        // Footer buttons
        this.panel.querySelector('[data-action="today"]')?.addEventListener('click', () => {
            const today = getTodayDate(this.calendarType);
            this.selectDate(today.year, today.month, today.day);
        });
        
        this.panel.querySelector('[data-action="clear"]')?.addEventListener('click', () => {
            this.clearSelection();
        });
    }
    
    handleDayKeydown(e, btn) {
        const day = parseInt(btn.dataset.day, 10);
        const month = parseInt(btn.dataset.month, 10);
        const year = parseInt(btn.dataset.year, 10);
        
        let newDay = day, newMonth = month, newYear = year;
        const daysInMonth = this.calendarType === 'jalali' 
            ? getJalaliMonthDays(year, month)
            : getGregorianMonthDays(year, month);
        
        switch (e.key) {
            case 'ArrowRight':
                e.preventDefault();
                newDay = day === daysInMonth ? 1 : day + 1;
                newMonth = day === daysInMonth ? (month === 12 ? 1 : month + 1) : month;
                newYear = day === daysInMonth && month === 12 ? year + 1 : year;
                break;
            case 'ArrowLeft':
                e.preventDefault();
                newDay = day === 1 ? daysInMonth : day - 1;
                newMonth = day === 1 ? (month === 1 ? 12 : month - 1) : month;
                newYear = day === 1 && month === 1 ? year - 1 : year;
                break;
            case 'ArrowDown':
                e.preventDefault();
                newDay = Math.min(day + 7, daysInMonth);
                break;
            case 'ArrowUp':
                e.preventDefault();
                newDay = Math.max(day - 7, 1);
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                this.selectDate(year, month, day);
                return;
            case 'Escape':
                this.close();
                this.input.focus();
                return;
        }
        
        // Find and focus the new day button
        const newBtn = this.panel.querySelector(`.date-picker-day[data-day="${newDay}"][data-month="${newMonth}"][data-year="${newYear}"]:not(.disabled)`);
        newBtn?.focus();
    }
    
    handleNavigation(action) {
        switch (action) {
            case 'prev-year':
                this.currentYear--;
                break;
            case 'next-year':
                this.currentYear++;
                break;
            case 'prev-month':
                if (this.currentMonth === 1) {
                    this.currentMonth = this.calendarType === 'jalali' ? 12 : 12;
                    this.currentYear--;
                } else {
                    this.currentMonth--;
                }
                break;
            case 'next-month':
                if (this.currentMonth === (this.calendarType === 'jalali' ? 12 : 12)) {
                    this.currentMonth = 1;
                    this.currentYear++;
                } else {
                    this.currentMonth++;
                }
                break;
        }
        this.updatePanel();
    }
    
    selectDate(year, month, day) {
        const formatted = formatDateForInput(year, month, day, this.calendarType);
        this.input.value = formatted;
        this.selectedDate = { year, month, day };
        this.currentYear = year;
        this.currentMonth = month;
        this.onSelect(formatted, { year, month, day });
        this.close();
        this.input.focus();
    }
    
    clearSelection() {
        this.input.value = '';
        this.selectedDate = null;
        this.onSelect('', null);
        this.close();
        this.input.focus();
    }
    
    destroy() {
        if (this.panel && this.panel.parentNode) {
            this.panel.parentNode.removeChild(this.panel);
        }
        if (this.wrapper && this.wrapper.parentNode) {
            this.wrapper.parentNode.insertBefore(this.input, this.wrapper);
            this.wrapper.parentNode.removeChild(this.wrapper);
        }
    }

    // Convert current viewed date when calendar type changes
    convertCurrentDateToNewCalendar() {
        if (this.currentYear == null || this.currentMonth == null) return;
        
        // Use day 15 (middle of month) for conversion to avoid edge cases
        const day = 15;
        
        if (this.previousCalendarType === 'jalali' && this.calendarType === 'gregorian') {
            // Jalali -> Gregorian
            const g = jalaliToGregorian(this.currentYear, this.currentMonth, day);
            this.currentYear = g.year;
            this.currentMonth = g.month;
        } else if (this.previousCalendarType === 'gregorian' && this.calendarType === 'jalali') {
            // Gregorian -> Jalali
            const j = gregorianToJalali(this.currentYear, this.currentMonth, day);
            this.currentYear = j.year;
            this.currentMonth = j.month;
        }
        
        // Also convert selectedDate if exists
        if (this.selectedDate) {
            if (this.previousCalendarType === 'jalali' && this.calendarType === 'gregorian') {
                const g = jalaliToGregorian(this.selectedDate.year, this.selectedDate.month, this.selectedDate.day);
                this.selectedDate = { year: g.year, month: g.month, day: g.day };
            } else if (this.previousCalendarType === 'gregorian' && this.calendarType === 'jalali') {
                const j = gregorianToJalali(this.selectedDate.year, this.selectedDate.month, this.selectedDate.day);
                this.selectedDate = { year: j.year, month: j.month, day: j.day };
            }
        }
    }
}

// Add new todo function
function addNewTodo() {
    const newTodoTitle = inputElem.value.trim();
    
    if (newTodoTitle === '') {
        showModalError(translate('modalErrorPleaseEnter'));
        shakeElement(inputElem);
        return;
    }
    
    // --- Timer ---
    let timerData = null;
    if (timerEnabledElem && timerEnabledElem.checked) {
        const rawVal = parseInt(timerValueElem.value, 10);
        const unit   = timerUnitElem.value; // 'seconds' | 'minutes' | 'hours'
        if (!isNaN(rawVal) && rawVal > 0) {
            const unitMultiplier = unit === 'hours' ? 3600 : unit === 'minutes' ? 60 : 1;
            timerData = {
                originalSeconds: rawVal * unitMultiplier,
                remainingSeconds: rawVal * unitMultiplier,
                unit: unit,
                unitValue: rawVal,
                running: true,   // counts down while task is active
                expired: false
            };
        }
    }

    // Capture tag, due date, and calendar type
    const tagValue = tagInput ? tagInput.value.trim() : '';
    const dueDateValue = dueDateInput ? dueDateInput.value : '';
    const calendarType = calendarTypeInput ? calendarTypeInput.value : 'gregorian';

    // Create new todo object with timestamp
    const newTodoObj = {
        id: Date.now(), // Use timestamp for unique ID
        title: newTodoTitle,
        complete: false,
        createdAt: new Date().toISOString(),
        priority: currentPriority,
        tag: tagValue,
        dueDate: dueDateValue,
        calendarType: calendarType,
        timer: timerData  // null if no timer set
    };
    
    // Add to array
    todosArray.push(newTodoObj);
    
    // Save to localStorage
    setLocalStorage(todosArray);

    // Update tag filter with new tags
    updateTagFilter();

    // Generate updated todo list
    todosGenerator(todosArray);

    // Clear input, reset timer UI, and focus
    inputElem.value = '';
    if (tagInput) tagInput.value = '';
    if (dueDateInput) dueDateInput.value = '';
    if (calendarTypeInput) calendarTypeInput.value = 'gregorian';
    initializeDatePicker();

    if (timerEnabledElem) {
        timerEnabledElem.checked = false;
        timerInputRowElem.classList.remove('visible');
        timerInputRowElem.setAttribute('aria-hidden', 'true');
        timerValueElem.value = '';
    }
    // Reset priority to medium
    currentPriority = 'medium';
    priorityButtons.forEach(b => b.classList.remove('active'));
    const mediumBtn = document.querySelector('.priority-btn[data-priority="medium"]');
    if (mediumBtn) mediumBtn.classList.add('active');
    inputElem.focus();
    
    // Show success feedback
    showSuccessFeedback(translate('successTaskAdded'));
}

// Show modal error message
function showModalError(message) {
    // Create modal element
    const modal = document.createElement('div');
    modal.className = 'error-modal';
    modal.innerHTML = `
        <div class="error-modal-content">
            <i class="fas fa-exclamation-circle error-icon"></i>
            <span class="error-text">${message}</span>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Remove modal after animation completes
    setTimeout(() => {
        if (modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    }, 2400);
}

// Show confirmation modal
function showConfirmModal(title, message, onConfirm, onCancel) {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'confirm-modal-overlay';
    
    // Create modal container
    const modal = document.createElement('div');
    modal.className = 'confirm-modal';
    
    modal.innerHTML = `
        <div class="confirm-modal-header">
            <i class="fas fa-exclamation-triangle confirm-icon"></i>
            <h3 class="confirm-title">${title}</h3>
        </div>
        <div class="confirm-modal-body">
            <p class="confirm-message">${message}</p>
        </div>
        <div class="confirm-modal-footer">
            <button class="btn btn-cancel">
                <i class="fas fa-times"></i> Cancel
            </button>
            <button class="btn btn-confirm">
                <i class="fas fa-check"></i> Confirm
            </button>
        </div>
    `;
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = ``;
    
    document.head.appendChild(style);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Get buttons
    const cancelBtn = modal.querySelector('.btn-cancel');
    const confirmBtn = modal.querySelector('.btn-confirm');
    
    // Handle cancel
    const handleCancel = () => {
        overlay.style.animation = 'fadeIn 0.2s ease reverse';
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
            if (onCancel) onCancel();
        }, 200);
    };
    
    // Handle confirm
    const handleConfirm = () => {
        overlay.style.animation = 'fadeIn 0.2s ease reverse';
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
            if (onConfirm) onConfirm();
        }, 200);
    };
    
    // Add event listeners
    cancelBtn.addEventListener('click', handleCancel);
    confirmBtn.addEventListener('click', handleConfirm);
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            handleCancel();
        }
    });
    
    // Close on Escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            handleCancel();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
    
    // Focus confirm button
    confirmBtn.focus();
}

// Show success feedback
function showSuccessFeedback(message) {
    const feedback = document.createElement('div');
    feedback.className = 'success-feedback';
    feedback.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(feedback);
    
    setTimeout(() => {
        feedback.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => feedback.remove(), 300);
    }, 2000);
}

// Shake element animation
function shakeElement(element) {
    element.style.animation = 'shake 0.5s ease';
    setTimeout(() => {
        element.style.animation = '';
    }, 500);
}

// Animations are defined in styleToDo.css

// ===== Timer Engine (Tasks 4, 5, 6, 7) =====

/**
 * Format seconds into HH:MM:SS or MM:SS display string.
 */
function formatCountdown(totalSeconds) {
    if (totalSeconds <= 0) return '00:00';
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) {
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Create a countdown badge element for a todo item.
 */
function createCountdownBadge(todo) {
    const badge = document.createElement('span');
    badge.className = 'countdown-badge';
    badge.dataset.id = todo.id;
    updateBadgeDisplay(badge, todo.timer);
    return badge;
}

/**
 * Update an existing badge element based on current timer state.
 */
function updateBadgeDisplay(badge, timer) {
    if (!timer) return;

    // Pick icon and text
    const icon = `<i class="fas fa-stopwatch" aria-hidden="true"></i>`;

    if (timer.expired) {
        badge.innerHTML = `${icon} Done`;
        badge.className = 'countdown-badge expired';
        return;
    }

    if (!timer.running) {
        // Paused (task was completed / undone)
        badge.innerHTML = `${icon} ${formatCountdown(timer.remainingSeconds)}`;
        badge.className = 'countdown-badge paused';
        return;
    }

    const rem = timer.remainingSeconds;
    badge.innerHTML = `${icon} ${formatCountdown(rem)}`;

    if (rem <= 10) {
        badge.className = 'countdown-badge danger';
    } else if (rem <= 60) {
        badge.className = 'countdown-badge warn';
    } else {
        badge.className = 'countdown-badge';
    }
}

/**
 * Global tick — fires every second, decrements all running timers.
 * Auto-completes tasks whose timer reaches 0.
 */
function tickTimers() {
    let changed = false;

    todosArray.forEach(todo => {
        if (!todo.timer || !todo.timer.running || todo.timer.expired || todo.complete) return;

        todo.timer.remainingSeconds -= 1;
        changed = true;

        if (todo.timer.remainingSeconds <= 0) {
            todo.timer.remainingSeconds = 0;
            todo.timer.running  = false;
            todo.timer.expired  = true;
            todo.complete       = true;
        }

        // Update badge in DOM without full re-render
        const badge = todoListElem.querySelector(`.countdown-badge[data-id="${todo.id}"]`);
        if (badge) {
            updateBadgeDisplay(badge, todo.timer);
        }

        // If expired, update the whole list item visually
        if (todo.timer.expired) {
            const li = todoListElem.querySelector(`li[data-id="${todo.id}"]`);
            if (li) {
                li.classList.add('uncompleted');
                const label = li.querySelector('label');
                const completeBtn = li.querySelector('.btn-success');
                const t = getCurrentTranslations();
                if (label) label.style.textDecoration = 'line-through';
                if (completeBtn) {
                    completeBtn.innerHTML = `<i class="fas fa-undo"></i> ${t.taskUndo}`;
                    completeBtn.className = 'btn btn-success';
                    // give it the grey "undo" look matching completed style
                    completeBtn.style.background = 'var(--text-3)';
                }
                showSuccessFeedback(translate('timerExpiredFeedback').replace('%s', todo.title));
            }
        }
    });

    if (changed) {
        setLocalStorage(todosArray);
    }
}

// Start the global timer tick
setInterval(tickTimers, 1000);

// ===== End Timer Engine =====


function setLocalStorage(todosList) {
    localStorage.setItem('todo', JSON.stringify(todosList));
    updateStatistics();
}

// Generate todo list HTML
function todosGenerator(todosList) {
    let filteredTodos = [...todosList];

    // Status filter
    if (currentFilter === 'active') {
        filteredTodos = filteredTodos.filter(todo => !todo.complete);
    } else if (currentFilter === 'completed') {
        filteredTodos = filteredTodos.filter(todo => todo.complete);
    }

    // Search filter
    if (searchQuery) {
        filteredTodos = filteredTodos.filter(todo =>
            todo.title.toLowerCase().includes(searchQuery) ||
            (todo.tag && todo.tag.toLowerCase().includes(searchQuery))
        );
    }

    // Priority filter
    if (priorityFilterValue !== 'all') {
        filteredTodos = filteredTodos.filter(todo => todo.priority === priorityFilterValue);
    }

    // Date filter
    if (dateFilterValue !== 'all') {
        const now = new Date();
        
        filteredTodos = filteredTodos.filter(todo => {
            if (!todo.dueDate) return dateFilterValue === 'no-date';
            
            let taskDate;
            
            if (todo.calendarType === 'jalali') {
                // Convert Jalali to Gregorian for comparison using our custom function
                const parts = todo.dueDate.split('/');
                if (parts.length === 3) {
                    const jYear = parseInt(parts[0], 10);
                    const jMonth = parseInt(parts[1], 10);
                    const jDay = parseInt(parts[2], 10);
                    const g = jalaliToGregorian(jYear, jMonth, jDay);
                    taskDate = new Date(g.year, g.month - 1, g.day);
                }
            } else {
                taskDate = new Date(todo.dueDate + 'T00:00:00');
            }
            
            if (!taskDate) return false;
            
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
            const weekEnd = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);
            
            if (dateFilterValue === 'today') {
                return taskDate >= todayStart && taskDate < todayEnd;
            }
            if (dateFilterValue === 'week') {
                return taskDate >= todayStart && taskDate < weekEnd;
            }
            if (dateFilterValue === 'overdue') {
                return taskDate < todayStart && !todo.complete;
            }
            return true;
        });
    }

    // Tag filter
    if (tagFilterValue !== 'all') {
        filteredTodos = filteredTodos.filter(todo => todo.tag === tagFilterValue);
    }

    // Clear current list
    todoListElem.innerHTML = '';

    // Show empty state if no todos
    if (filteredTodos.length === 0) {
        const emptyState = getEmptyStateMessage();
        todoListElem.appendChild(emptyState);
        return;
    }

    // Create todo items
    filteredTodos.forEach(todo => {
        const todoItem = createTodoElement(todo);
        todoListElem.appendChild(todoItem);
    });
}

// Get empty state message element
function getEmptyStateMessage() {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    
    let message = '';
    if (currentFilter === 'all' && todosArray.length === 0) {
        message = 'No tasks yet. Start by adding your first task!';
    } else if (currentFilter === 'active') {
        message = 'No active tasks. All tasks are completed!';
    } else if (currentFilter === 'completed') {
        message = 'No completed tasks yet. Complete some tasks!';
    }
    
    emptyState.innerHTML = `
        <i class="far fa-clipboard empty-icon"></i>
        <h3>${message}</h3>
    `;
    
    return emptyState;
}

// Create todo element
function createTodoElement(todo) {
    const li = document.createElement('li');
    li.className = `task-item-enter ${todo.complete ? 'uncompleted' : ''}`;
    li.dataset.id = todo.id;
    
    // Task label
    const label = document.createElement('label');
    label.textContent = todo.title;
    label.setAttribute('for', `task-${todo.id}`);
    
    // Get current translations
    const t = getCurrentTranslations();
    
    // Complete/Uncomplete button
    const completeBtn = document.createElement('button');
    completeBtn.className = 'btn btn-success';
    completeBtn.innerHTML = todo.complete ? 
        `<i class="fas fa-undo"></i> ${t.taskUndo}` : 
        `<i class="fas fa-check"></i> ${t.taskComplete}`;
    completeBtn.onclick = () => completeFunc(todo.id);
    
    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-danger';
    deleteBtn.innerHTML = `<i class="fas fa-trash"></i> ${t.taskDelete}`;
    deleteBtn.onclick = (event) => deleteFunc(todo.id, event);
    
    // Priority indicator
    const prioritySpan = document.createElement('span');
    prioritySpan.className = `priority-indicator priority-${todo.priority}`;
    prioritySpan.title = `Priority: ${todo.priority}`;
    prioritySpan.innerHTML = `<i class="fas fa-flag"></i> ${todo.priority}`;

    // Tag badge
    if (todo.tag) {
        const tagSpan = document.createElement('span');
        tagSpan.className = 'tag-badge';
        tagSpan.innerHTML = `<i class="fas fa-tag"></i> ${todo.tag}`;
        li.appendChild(tagSpan);
    }

    // Due date badge
    if (todo.dueDate) {
        const dueDateSpan = document.createElement('span');
        dueDateSpan.className = 'due-date-badge';
        
        let formattedDate;
        let isOverdue = false;
        
        if (todo.calendarType === 'jalali') {
            // Display Jalali date
            formattedDate = todo.dueDate; // Already in YYYY/MM/DD format
            // Convert to Gregorian for overdue check using our custom function
            const parts = todo.dueDate.split('/');
            if (parts.length === 3) {
                const jYear = parseInt(parts[0], 10);
                const jMonth = parseInt(parts[1], 10);
                const jDay = parseInt(parts[2], 10);
                const g = jalaliToGregorian(jYear, jMonth, jDay);
                const gregorianDate = new Date(g.year, g.month - 1, g.day);
                isOverdue = gregorianDate < new Date() && !todo.complete;
            }
            formattedDate = formattedDate + ' (شمسی)';
        } else {
            // Display Gregorian date
            const date = new Date(todo.dueDate + 'T00:00:00');
            isOverdue = date < new Date() && !todo.complete;
            formattedDate = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        }
        
        if (isOverdue) dueDateSpan.classList.add('overdue');
        dueDateSpan.innerHTML = `<i class="fas fa-calendar-alt"></i> ${formattedDate}`;
        li.appendChild(dueDateSpan);
    }

    // Append all elements
    li.appendChild(prioritySpan);
    li.appendChild(label);

    // Countdown badge (Task 4)
    if (todo.timer) {
        const badge = createCountdownBadge(todo);
        li.appendChild(badge);
    }

    li.appendChild(completeBtn);
    li.appendChild(deleteBtn);

    // Settings (edit) button
    const settingsBtn = document.createElement('button');
    settingsBtn.className = 'btn btn-settings';
    settingsBtn.innerHTML = `<i class="fas fa-ellipsis-h"></i>`;
    settingsBtn.title = t.taskSettings || 'Settings';
    settingsBtn.setAttribute('aria-label', t.taskSettings || 'Settings');
    settingsBtn.onclick = () => editFunc(todo.id);
    li.appendChild(settingsBtn);
    
    return li;
}

// Load todos from localStorage
function getLocalStorage() {
    const localStorageTodos = JSON.parse(localStorage.getItem('todo'));

    if (localStorageTodos) {
        todosArray = localStorageTodos;
    } else {
        todosArray = [];
    }

    updateTagFilter();
    todosGenerator(todosArray);
    updateStatistics();
}

// Clear all todos
function clearTodos() {
    if (todosArray.length === 0) {
        showModalError(translate('modalErrorNoTasks'));
        return;
    }
    
    showConfirmModal(
        translate('modalConfirmDeleteAllTitle'),
        translate('modalConfirmDeleteAllMessage'),
        () => {
            // Confirmed - delete all tasks
            localStorage.removeItem('todo');
            todosArray = [];
            updateTagFilter();
            todosGenerator(todosArray);
            updateStatistics();
            showSuccessFeedback(translate('successTasksCleared'));
        },
        () => {
            // Cancelled - do nothing
        }
    );
}

// Handle keyboard input
function handleKeyDown(event) {
    if (event.key === 'Enter') {
        throttledAddNewTodoInput();
    }
}

// Delete todo function
function deleteFunc(todoId, event) {
    // Find the task to get its title
    const taskToDelete = todosArray.find(todo => todo.id === todoId);
    
    if (!taskToDelete) return;
    
    // Show confirmation modal
    showConfirmModal(
        translate('modalConfirmDeleteTitle'),
        translate('modalConfirmDeleteMessage').replace('%s', taskToDelete.title),
        () => {
            // Confirmed - delete the task
            const todoItem = event.target.closest('li');
            
            if (todoItem) {
                // Add delete animation
                todoItem.style.animation = 'deleteTask 400ms ease forwards';
                
                // Remove from DOM after animation
                setTimeout(() => {
                    todoItem.remove();
                    
                    // Remove from array
                    const deleteIndex = todosArray.findIndex(todo => todo.id === todoId);
                    
                    if (deleteIndex !== -1) {
                        todosArray.splice(deleteIndex, 1);
                        setLocalStorage(todosArray);
                        updateStatistics();
                        updateTagFilter();
                    }
                    
                    // Check if list is now empty
                    if (todosArray.length === 0) {
                        const emptyState = getEmptyStateMessage();
                        todoListElem.appendChild(emptyState);
                    }
                }, 400);
            }
        },
        () => {
            // Cancelled - do nothing
        }
    );
}

// ===== Edit Task =====

/**
 * Open the edit modal for a task.
 * @param {number} todoId
 */
function editFunc(todoId) {
    const todo = todosArray.find(t => t.id === todoId);
    if (!todo) return;
    showEditModal(todo, (updatedTitle, updatedTimer, updatedPriority, updatedTag, updatedDueDate, updatedCalendarType) => {
        const idx = todosArray.findIndex(t => t.id === todoId);
        if (idx === -1) return;

        // Update title
        todosArray[idx].title = updatedTitle;

        // Update priority
        todosArray[idx].priority = updatedPriority;

        // Update tag
        todosArray[idx].tag = updatedTag;

        // Update due date
        todosArray[idx].dueDate = updatedDueDate;

        // Update calendar type
        todosArray[idx].calendarType = updatedCalendarType;

        // Update timer
        if (updatedTimer === null) {
            // User cleared the timer
            todosArray[idx].timer = null;
        } else if (updatedTimer) {
            const existing = todosArray[idx].timer;
            // If the duration changed, rebuild the timer from scratch
            if (!existing || existing.originalSeconds !== updatedTimer.originalSeconds) {
                todosArray[idx].timer = {
                    originalSeconds:  updatedTimer.originalSeconds,
                    remainingSeconds: updatedTimer.originalSeconds,
                    unit:      updatedTimer.unit,
                    unitValue: updatedTimer.unitValue,
                    running:   !todosArray[idx].complete,
                    expired:   false
                };
            }
            // else: duration unchanged — keep the running countdown as-is
        }

        setLocalStorage(todosArray);
        updateTagFilter();
        todosGenerator(todosArray);
        showSuccessFeedback(translate('successTaskEdited'));
    });
}

/**
 * Show the edit modal pre-filled with the task's current values.
 * Calls onSave(newTitle, newTimerData | null) when user confirms.
 */
function showEditModal(todo, onSave) {
    const t = getCurrentTranslations();

    // Resolve current timer display values
    const hasTimer   = !!todo.timer;
    const timerUnit  = hasTimer ? (todo.timer.unit  || 'minutes') : 'minutes';
    // Show remaining if running, original if expired/paused
    const timerSecs  = hasTimer
        ? (todo.timer.expired ? todo.timer.originalSeconds : todo.timer.remainingSeconds)
        : 0;
    const unitDiv    = timerUnit === 'hours' ? 3600 : timerUnit === 'minutes' ? 60 : 1;
    const timerVal   = hasTimer ? Math.max(1, Math.round(timerSecs / unitDiv)) : '';

    const overlay = document.createElement('div');
    overlay.className = 'edit-modal-overlay';

    const currentPriority = todo.priority || 'medium';
    const currentTag = todo.tag || '';
    const currentDueDate = todo.dueDate || '';
    const currentCalendarType = todo.calendarType || 'gregorian';

    overlay.innerHTML = `
        <div class="edit-modal" role="dialog" aria-modal="true" aria-labelledby="editModalTitle">
            <div class="edit-modal-header">
                <i class="fas fa-pen-to-square edit-modal-icon"></i>
                <h3 class="edit-modal-title" id="editModalTitle">${t.editModalTitle}</h3>
            </div>
            <div class="edit-modal-body">

                <label class="edit-field-label" for="editTaskName">
                    <i class="fas fa-tasks"></i> ${t.editLabelName}
                </label>
                <input
                    type="text"
                    id="editTaskName"
                    class="form-control edit-name-input"
                    value="${escapeHtml(todo.title)}"
                    placeholder="${t.editNamePlaceholder}"
                    autocomplete="off"
                />

                <label class="edit-field-label" for="editPriority">
                    <i class="fas fa-flag"></i> Priority
                </label>
                <div class="edit-priority-selector" role="radiogroup" aria-label="Task priority">
                    <button type="button" class="priority-btn priority-high ${currentPriority === 'high' ? 'active' : ''}" data-priority="high">
                        <i class="fas fa-flag"></i> High
                    </button>
                    <button type="button" class="priority-btn priority-medium ${currentPriority === 'medium' ? 'active' : ''}" data-priority="medium">
                        <i class="fas fa-flag"></i> Medium
                    </button>
                    <button type="button" class="priority-btn priority-low ${currentPriority === 'low' ? 'active' : ''}" data-priority="low">
                        <i class="fas fa-flag"></i> Low
                    </button>
                </div>

                <label class="edit-field-label" for="editTag">
                    <i class="fas fa-tag"></i> Tag
                </label>
                <input
                    type="text"
                    id="editTag"
                    class="form-control edit-tag-input"
                    value="${escapeHtml(currentTag)}"
                    placeholder="e.g. work, personal"
                    autocomplete="off"
                />

                <label class="edit-field-label" for="editCalendarType">
                    <i class="fas fa-calendar-alt"></i> ${t.calendarTypeLabel}
                </label>
                <select id="editCalendarType" class="form-control edit-calendar-select">
                    <option value="gregorian" ${currentCalendarType === 'gregorian' ? 'selected' : ''}>${t.calendarGregorian}</option>
                    <option value="jalali" ${currentCalendarType === 'jalali' ? 'selected' : ''}>${t.calendarJalali}</option>
                </select>

                <label class="edit-field-label" for="editDueDate">
                    <i class="fas fa-calendar-day"></i> ${t.dueDateLabel}
                </label>
                <input
                    type="text"
                    id="editDueDate"
                    class="form-control edit-duedate-input"
                    value="${currentDueDate}"
                    placeholder="Select date"
                    autocomplete="off"
                />

                <div class="edit-timer-section">
                    <label class="edit-timer-toggle-label">
                        <input type="checkbox" id="editTimerEnabled" ${hasTimer ? 'checked' : ''} />
                        <i class="fas fa-stopwatch"></i>
                        <span>${t.editLabelTimer}</span>
                    </label>

                    <div class="edit-timer-input-row ${hasTimer ? 'visible' : ''}" id="editTimerInputRow">
                        <div class="timer-input-group">
                            <input
                                type="number"
                                id="editTimerValue"
                                class="form-control timer-value-input"
                                min="1"
                                max="9999"
                                value="${timerVal}"
                                placeholder="${t.timerPlaceholder}"
                            />
                            <select id="editTimerUnit" class="form-control timer-unit-select">
                                <option value="seconds" ${timerUnit === 'seconds' ? 'selected' : ''}>${t.timerUnitSeconds}</option>
                                <option value="minutes" ${timerUnit === 'minutes' ? 'selected' : ''}>${t.timerUnitMinutes}</option>
                                <option value="hours"   ${timerUnit === 'hours'   ? 'selected' : ''}>${t.timerUnitHours}</option>
                            </select>
                        </div>
                        <p class="timer-hint">
                            <i class="fas fa-info-circle"></i> ${t.timerHint}
                        </p>
                    </div>
                </div>

            </div>
            <div class="edit-modal-footer">
                <button class="btn btn-edit-cancel" id="editCancelBtn">
                    <i class="fas fa-times"></i> ${t.editCancel}
                </button>
                <button class="btn btn-edit-save" id="editSaveBtn">
                    <i class="fas fa-check"></i> ${t.editSave}
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Wire up timer toggle inside modal
    const editTimerEnabled  = overlay.querySelector('#editTimerEnabled');
    const editTimerInputRow = overlay.querySelector('#editTimerInputRow');
    editTimerEnabled.addEventListener('change', () => {
        editTimerInputRow.classList.toggle('visible', editTimerEnabled.checked);
    });

    // Priority selector in modal
    let modalPriority = currentPriority;
    const modalPriorityBtns = overlay.querySelectorAll('.edit-priority-selector .priority-btn');
    modalPriorityBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modalPriorityBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            modalPriority = btn.dataset.priority;
        });
    });

    const editDueDate = overlay.querySelector('#editDueDate');
    const editCalendarType = overlay.querySelector('#editCalendarType');

    // Initialize edit modal datepicker
    function initEditDatePicker() {
        const calType = editCalendarType.value;
        
        // Destroy existing datepicker if any
        if (editDueDate._datePicker) {
            editDueDate._datePicker.destroy();
            editDueDate._datePicker = null;
        }
        
        // Remove any existing wrapper
        if (editDueDate.parentElement.classList.contains('date-picker-wrapper')) {
            const wrapper = editDueDate.parentElement;
            wrapper.parentNode.insertBefore(editDueDate, wrapper);
            wrapper.parentNode.removeChild(wrapper);
        }
        
        editDueDate.type = 'text';
        editDueDate.setAttribute('placeholder', calType === 'jalali' ? 'مثال: 1405/07/17' : 'YYYY/MM/DD');
        editDueDate.setAttribute('autocomplete', 'off');
        
        // Create new custom date picker
        editDueDate._datePicker = new DatePicker(editDueDate, editCalendarType, {
            onSelect: function(value, dateObj) {
                console.log('Edit date selected:', value, dateObj);
            }
        });
    }

    // Initialize datepicker based on current calendar type.
    // The DatePicker instance itself listens for calendarType changes internally
    // (see DatePicker.init()), so we do NOT attach a separate change listener here.
    // A second listener would destroy/recreate the picker on every type switch,
    // which undoes the conversion the DatePicker's own listener already performed.
    initEditDatePicker();

    // Focus the name field
    const nameInput = overlay.querySelector('#editTaskName');
    setTimeout(() => nameInput.focus(), 50);

    // Save
    const handleSave = () => {
        const newTitle = nameInput.value.trim();
        if (!newTitle) {
            nameInput.classList.add('input-error');
            nameInput.focus();
            setTimeout(() => nameInput.classList.remove('input-error'), 800);
            return;
        }

        let newTimer = undefined; // undefined = keep unchanged

        if (!editTimerEnabled.checked) {
            newTimer = null; // explicitly cleared
        } else {
            const rawVal = parseInt(overlay.querySelector('#editTimerValue').value, 10);
            const unit   = overlay.querySelector('#editTimerUnit').value;
            if (!isNaN(rawVal) && rawVal > 0) {
                const mult = unit === 'hours' ? 3600 : unit === 'minutes' ? 60 : 1;
                newTimer = {
                    originalSeconds: rawVal * mult,
                    unit:            unit,
                    unitValue:       rawVal
                };
            } else {
                newTimer = null; // invalid input → clear timer
            }
        }

        const newTag = overlay.querySelector('#editTag').value.trim();
        const newDueDate = editDueDate ? editDueDate.value : '';
        const newCalendarType = editCalendarType ? editCalendarType.value : 'gregorian';

        closeModal();
        onSave(newTitle, newTimer, modalPriority, newTag, newDueDate, newCalendarType);
    };

    const closeModal = () => {
        overlay.style.animation = 'editModalFadeOut 0.2s ease forwards';
        setTimeout(() => { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 220);
    };

    overlay.querySelector('#editSaveBtn').addEventListener('click', handleSave);
    overlay.querySelector('#editCancelBtn').addEventListener('click', closeModal);

    // Close on overlay backdrop click
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

    // Save on Enter, close on Escape
    nameInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') closeModal();
    });
}

/** Simple HTML escaping to safely set value attributes */
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// Complete/Uncomplete todo function
function completeFunc(todoId) {
    const todoIndex = todosArray.findIndex(todo => todo.id === todoId);
    
    if (todoIndex !== -1) {
        // Toggle completion status
        todosArray[todoIndex].complete = !todosArray[todoIndex].complete;

        // --- Timer: pause on complete, restore on undo ---
        const timer = todosArray[todoIndex].timer;
        if (timer && !timer.expired) {
            if (todosArray[todoIndex].complete) {
                // Task just completed — pause the countdown
                timer.running = false;
            } else {
                // Task un-done — resume the countdown
                timer.running = true;
            }
        }
        
        // Save to localStorage
        setLocalStorage(todosArray);
        
        // Regenerate todo list
        todosGenerator(todosArray);
        
        // Show feedback
        const actionKey = todosArray[todoIndex].complete ? 'successTaskCompleted' : 'successTaskActivated';
        showSuccessFeedback(translate(actionKey));
    }
}

// Update statistics
function updateStatistics() {
    const total = todosArray.length;
    const completed = todosArray.filter(todo => todo.complete).length;
    const active = total - completed;
    
    // Update DOM elements
    taskCountElem.textContent = total;
    totalTasksElem.textContent = total;
    activeTasksElem.textContent = active;
    completedTasksElem.textContent = completed;
    
    // Update badge color based on count
    if (total === 0) {
        taskCountElem.className = 'badge bg-secondary';
    } else if (active === 0) {
        taskCountElem.className = 'badge bg-success';
    } else {
        taskCountElem.className = 'badge bg-primary';
    }
}

// Update clock
function updateClock() {
    const now = new Date();
    
    // Format time with leading zeros
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    // Update DOM elements
    hourElem.textContent = hours;
    minuteElem.textContent = minutes;
    secondElem.textContent = seconds;
}

// Initialize clock
setInterval(updateClock, 1000);

// ===== Theme Management Functions =====

/**
 * Initialize theme on page load
 * Priority: localStorage > system preference > default (light)
 */
function initTheme() {
    const storedTheme = getStoredTheme();
    
    if (storedTheme) {
        // User has previously set a preference
        setTheme(storedTheme, false);
        isUserOverride = true;
    } else {
        // Check system preference
        const systemPreference = getSystemPreference();
        if (systemPreference) {
            setTheme(systemPreference, false);
            // Do NOT set isUserOverride - this is system-based
        } else {
            // Default to light
            setTheme('light', false);
        }
    }
    
    // Setup listener for system preference changes
    setupSystemPreferenceListener();
}

/**
 * Toggle between light and dark themes
 */
function toggleTheme() {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme, true);
}

/**
 * Set the theme and update all dependent systems
 * @param {string} theme - 'light' or 'dark'
 * @param {boolean} isUserAction - Whether this is a user-initiated change
 */
function setTheme(theme, isUserAction) {
    currentTheme = theme;
    
    // Update data attribute on document element
    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
    
    // Store if user-initiated
    if (isUserAction) {
        isUserOverride = true;
        setStoredTheme(theme);
    }
    
    // Update toggle button icon and aria-label
    updateToggleButton(theme);
}

/**
 * Get stored theme from localStorage
 * @returns {string|null} 'light', 'dark', or null
 */
function getStoredTheme() {
    try {
        return localStorage.getItem(THEME_STORAGE_KEY);
    } catch (error) {
        // localStorage unavailable (private browsing, quota exceeded, etc.)
        console.warn('Theme storage unavailable:', error.message);
        return null;
    }
}

/**
 * Store theme preference in localStorage
 * @param {string} theme - 'light' or 'dark'
 */
function setStoredTheme(theme) {
    try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
        // Handle quota exceeded or unavailable storage
        console.warn('Could not save theme preference:', error.message);
        // Continue functioning - theme works for this session
    }
}

/**
 * Detect OS color scheme preference
 * @returns {string|null} 'light', 'dark', or null if unsupported
 */
function getSystemPreference() {
    if (!window.matchMedia) {
        return null;
    }
    
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    
    if (window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
    }
    
    return null;
}

/**
 * Setup listener for system preference changes
 */
function setupSystemPreferenceListener() {
    if (!window.matchMedia) return;
    
    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Modern browsers
    if (darkQuery.addEventListener) {
        darkQuery.addEventListener('change', handleSystemPreferenceChange);
    } else if (darkQuery.addListener) {
        // Legacy support (Safari < 14)
        darkQuery.addListener(handleSystemPreferenceChange);
    }
}

/**
 * Handle system preference change event
 * @param {MediaQueryListEvent} event
 */
function handleSystemPreferenceChange(event) {
    // Only apply if user hasn't set their own preference
    if (isUserOverride) {
        return;
    }
    
    const newTheme = event.matches ? 'dark' : 'light';
    setTheme(newTheme, false);
}

/**
 * Update toggle button icon and accessibility attributes
 * @param {string} theme - Current theme
 */
function updateToggleButton(theme) {
    if (!themeToggleBtn || !themeIcon) return;
    const t = translations[currentLanguage];
    
    if (theme === 'dark') {
        // Show sun icon (to switch to light)
        themeIcon.className = 'fas fa-sun theme-icon';
        themeToggleBtn.setAttribute('aria-label', t.themeToggleAriaLabelDark);
    } else {
        // Show moon icon (to switch to dark)
        themeIcon.className = 'fas fa-moon theme-icon';
        themeToggleBtn.setAttribute('aria-label', t.themeToggleAriaLabelLight);
    }
}

/**
 * Handle keyboard events on toggle button
 * @param {KeyboardEvent} event
 */
function handleToggleKeydown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleTheme();
    }
}

/* ===== Bilingual Support (English/Persian) ===== */
const translations = {
    en: {
        // Header
        appTitle: "Todo List Pro",
        appSubtitle: "Professional Task Management",
        
        // Clock
        hours: "Hours",
        minutes: "Minutes",
        seconds: "Seconds",
        
        // Add Task section
        sectionTitleAdd: "Add New Task",
        inputPlaceholder: "Enter a new task...",
        addButton: "Add Task",
        clearButton: "Clear All",
        inputHint: "Press Enter to quickly add tasks",
        
        // Tasks section
        sectionTitleTasks: "Your Tasks",
        filterAll: "All",
        filterActive: "Active",
        filterCompleted: "Completed",
        emptyStateTitle: "No tasks yet",
        emptyStateDescription: "Start by adding your first task above!",
        
        // Task buttons (per task)
        taskComplete: "Complete",
        taskUndo: "Undo",
        taskDelete: "Delete",
        
        // Stats
        statTotal: "Total:",
        statActive: "Active:",
        statCompleted: "Completed:",
        
        // Footer
        footerBuilt: "Built with ♥ using HTML, CSS & JavaScript",
        footerCopyright: "© %s Todo List Pro | v1.0.0",
        
        // Modals
        modalErrorPleaseEnter: "Please enter a task!",
        modalErrorNoTasks: "No tasks to clear!",
        modalConfirmDeleteAllTitle: "Delete All Tasks",
        modalConfirmDeleteAllMessage: "Are you sure you want to delete all tasks? This action cannot be undone.",
        modalConfirmDeleteTitle: "Delete Task",
        modalConfirmDeleteMessage: 'Are you sure you want to delete "%s"?',
        successTaskAdded: "Task added successfully!",
        successTasksCleared: "All tasks cleared!",
        successTaskCompleted: "Task completed!",
        successTaskActivated: "Task marked as active!",
        
        // Theme
        themeToggleAriaLabelDark: "Switch to light mode",
        themeToggleAriaLabelLight: "Switch to dark mode",
        langToggleAriaLabelEn: "Switch to Persian",
        langToggleAriaLabelFa: "Switch to English",

        // Timer
        timerToggleLabel: "Set a timer for this task",
        timerPlaceholder: "e.g. 30",
        timerUnitSeconds: "Seconds",
        timerUnitMinutes: "Minutes",
        timerUnitHours: "Hours",
        timerHint: "Task will auto-complete when time runs out",
        timerExpiredFeedback: '⏰ Time\'s up! "%s" was auto-completed.',

        // Calendar
        calendarTypeLabel: "Calendar Type",
        calendarGregorian: "Gregorian",
        calendarJalali: "Jalali (Persian)",

        // Edit modal
        taskSettings:        "Settings",
        editModalTitle:      "Edit Task",
        editLabelName:       "Task name",
        editNamePlaceholder: "Enter task name...",
        editLabelTimer:      "Set / update timer",
        editSave:            "Save",
        editCancel:          "Cancel",
        successTaskEdited:   "Task updated successfully!",

        // Search & Filters
        searchPlaceholder:    "Search tasks...",
        filterAllPriorities:  "All Priorities",
        filterHigh:           "High",
        filterMedium:         "Medium",
        filterLow:            "Low",
        filterAllDates:       "All Dates",
        filterToday:          "Today",
        filterThisWeek:       "This Week",
        filterOverdue:        "Overdue",
        filterNoDate:         "No Date",
        filterAllTags:        "All Tags",
        priorityLabel:        "Priority",
        tagLabel:             "Tag",
        tagPlaceholder:       "e.g. work, personal",
        dueDateLabel:         "Due Date"
    },
    
    fa: {
        // Header
        appTitle: "لیست کارها",
        appSubtitle: "مدیریت کارهای احترافی",
        
        // Clock
        hours: "ساعت",
        minutes: "دقیقه",
        seconds: "ثانیه",
        
        // Add Task section
        sectionTitleAdd: "افزودن کار جدید",
        inputPlaceholder: "یک کار جدید وارد کنید",
        addButton: "افزودن",
        clearButton: "پاک کردن همه",
        inputHint: "برای افزودن سریع کار، Enter را فشار دهید",
        
        // Tasks section
        sectionTitleTasks: "کارهای شما",
        filterAll: "تمام",
        filterActive: "فعال",
        filterCompleted: "تمام شده",
        emptyStateTitle: "هنوز کار بافتی",
        emptyStateDescription: "ابتدا اولین کار خود را اضافه کنید!",
        
        // Task buttons (per task)
        taskComplete: "انجام",
        taskUndo: "لغو",
        taskDelete: "حذف",
        
        // Stats
        statTotal: "کل:",
        statActive: "فعال:",
        statCompleted: "تمام شده:",
        
        // Footer
        footerBuilt: "با ♥ ساخته شده با HTML, CSS & JavaScript",
        footerCopyright: "© %s لیست کارها | v1.0.0",
        
        // Modals
        modalErrorPleaseEnter: "لطفا کار وارد کنید!",
        modalErrorNoTasks: "هیچ کاری برای پاک کردن وجود ندارد!",
        modalConfirmDeleteAllTitle: "پاک کردن همه کارها",
        modalConfirmDeleteAllMessage: "آیا می‌خواهید تمام کارها پاک شوند؟ این عمل قابل بازگشت نیست.",
        modalConfirmDeleteTitle: "حذف کار",
        modalConfirmDeleteMessage: 'آیا می‌خواهید "%s" حذف شود؟',
        successTaskAdded: "کار با موفقیت افزوده شد!",
        successTasksCleared: "تمام کارها پاک شدند!",
        successTaskCompleted: "کار انجام شد!",
        successTaskActivated: "کار به حالت فعال برگشت!",
        
        // Theme
        themeToggleAriaLabelDark: "بروزرسانی به حالت روشن",
        themeToggleAriaLabelLight: "بروزرسانی به حالت تیره",
        langToggleAriaLabelEn: "بروزرسانی به فارسی",
        langToggleAriaLabelFa: "بروزرسانی به انگلیسی",

        // Timer
        timerToggleLabel: "تایمر برای این کار تنظیم کن",
        timerPlaceholder: "مثلاً ۳۰",
        timerUnitSeconds: "ثانیه",
        timerUnitMinutes: "دقیقه",
        timerUnitHours: "ساعت",
        timerHint: "کار پس از پایان تایمر به‌طور خودکار تمام می‌شود",
        timerExpiredFeedback: '⏰ وقت تموم شد! "%s" به‌طور خودکار انجام شد.',

        // Calendar
        calendarTypeLabel: "نوع تقویم",
        calendarGregorian: "میلادی",
        calendarJalali: "شمسی (هجری شمسی)",

        // Edit modal
        taskSettings:        "تنظیمات",
        editModalTitle:      "ویرایش کار",
        editLabelName:       "نام کار",
        editNamePlaceholder: "نام کار را وارد کنید...",
        editLabelTimer:      "تایمر را تنظیم / بروزرسانی کن",
        editSave:            "ذخیره",
        editCancel:          "انصراف",
        successTaskEdited:   "کار با موفقیت بروزرسانی شد!",

        // Search & Filters
        searchPlaceholder:    "جستجوی کارها...",
        filterAllPriorities:  "همه اولویت‌ها",
        filterHigh:           "بالا",
        filterMedium:         "متوسط",
        filterLow:            "پایین",
        filterAllDates:       "همه تاریخ‌ها",
        filterToday:          "امروز",
        filterThisWeek:       "این هفته",
        filterOverdue:        "تاخیر",
        filterNoDate:         "بدون تاریخ",
        filterAllTags:        "همه برچسب‌ها",
        priorityLabel:        "اولویت",
        tagLabel:             "برچسب",
        tagPlaceholder:       "مثلاً کار، شخصی",
        dueDateLabel:         "تاریخ انقضا"
    }
};

let currentLanguage = 'en';

// Update all text elements based on current language
function updateTexts() {
    const t = translations[currentLanguage];
    
    // Header
    const appTitle = $.getElementById('appTitle');
    const appSubtitle = $.getElementById('appSubtitle');
    if (appTitle) appTitle.textContent = t.appTitle;
    if (appSubtitle) appSubtitle.textContent = t.appSubtitle;
    
    // Clock labels
    const hourLabel = $.getElementById('hourLabel');
    const minuteLabel = $.getElementById('minuteLabel');
    const secondLabel = $.getElementById('secondLabel');
    if (hourLabel) hourLabel.textContent = t.hours;
    if (minuteLabel) minuteLabel.textContent = t.minutes;
    if (secondLabel) secondLabel.textContent = t.seconds;
    
    // Add Task section
    const sectionTitleAdd = $.querySelector('.input-section .section-title');
    const inputElem = $.getElementById('itemInput');
    const addButton = $.getElementById('addButton');
    const clearButton = $.getElementById('clearButton');
    const inputHint = $.querySelector('.input-hint');
    if (sectionTitleAdd) sectionTitleAdd.innerHTML = `<i class="fas fa-plus-circle"></i> ${t.sectionTitleAdd}`;
    if (inputElem) inputElem.placeholder = t.inputPlaceholder;
    if (addButton) addButton.innerHTML = `<i class="fas fa-plus"></i> ${t.addButton}`;
    if (clearButton) clearButton.innerHTML = `<i class="fas fa-trash-alt"></i> ${t.clearButton}`;
    if (inputHint) inputHint.innerHTML = `<i class="fas fa-lightbulb"></i> ${t.inputHint}`;
    
    // Tasks section
    const sectionTitleTasks = $.querySelector('.tasks-section .section-title');
    const filterAll = $.querySelector('.filter-btn[data-filter="all"]');
    const filterActive = $.querySelector('.filter-btn[data-filter="active"]');
    const filterCompleted = $.querySelector('.filter-btn[data-filter="completed"]');
    const emptyMessage = $.getElementById('emptyMessage');
    const emptyTitle = emptyMessage ? emptyMessage.querySelector('h3') : null;
    const emptyDesc = emptyMessage ? emptyMessage.querySelector('p') : null;
    if (sectionTitleTasks) sectionTitleTasks.innerHTML = `<i class="fas fa-list-check"></i> ${t.sectionTitleTasks} <span class="badge bg-primary" id="taskCount">0</span>`;
    if (filterAll) filterAll.textContent = t.filterAll;
    if (filterActive) filterActive.textContent = t.filterActive;
    if (filterCompleted) filterCompleted.textContent = t.filterCompleted;
    if (emptyTitle) emptyTitle.textContent = t.emptyStateTitle;
    if (emptyDesc) emptyDesc.textContent = t.emptyStateDescription;
    
    // Stats
    const totalLabel = $.querySelector('.stat-label[data-stat="total"]');
    const activeLabel = $.querySelector('.stat-label[data-stat="active"]');
    const completedLabel = $.querySelector('.stat-label[data-stat="completed"]');
    if (totalLabel) totalLabel.textContent = t.statTotal;
    if (activeLabel) activeLabel.textContent = t.statActive;
    if (completedLabel) completedLabel.textContent = t.statCompleted;
    
    // Footer
    const copyrightText = $.querySelector('.footer-copyright');
    if (copyrightText) {
        copyrightText.innerHTML = t.footerCopyright.replace('%s', new Date().getFullYear());
    }
    const footerBuilt = $.querySelector('.footer-text');
    if (footerBuilt) {
        footerBuilt.innerHTML = `<i class="fas fa-code"></i> ${t.footerBuilt}`;
    }
    
    // Timer UI texts
    const timerToggleText = $.getElementById('timerToggleText');
    const timerHintElem   = $.getElementById('timerHint');
    const timerValueInput = $.getElementById('timerValue');
    const timerUnitSelect = $.getElementById('timerUnit');
    if (timerToggleText) timerToggleText.textContent = t.timerToggleLabel;
    if (timerHintElem)   timerHintElem.innerHTML = `<i class="fas fa-info-circle"></i> ${t.timerHint}`;
    if (timerValueInput) timerValueInput.placeholder = t.timerPlaceholder;
    if (timerUnitSelect) {
        const opts = timerUnitSelect.options;
        if (opts[0]) opts[0].textContent = t.timerUnitSeconds;
        if (opts[1]) opts[1].textContent = t.timerUnitMinutes;
        if (opts[2]) opts[2].textContent = t.timerUnitHours;
    }

    // Calendar type selector
    const calTypeSelect = $.getElementById('calendarTypeInput');
    if (calTypeSelect) {
        const opts = calTypeSelect.options;
        if (opts[0]) opts[0].textContent = t.calendarGregorian;
        if (opts[1]) opts[1].textContent = t.calendarJalali;
    }

    // Calendar type label
    const calTypeLabel = $.querySelector('label[for="calendarTypeInput"]');
    if (calTypeLabel) calTypeLabel.innerHTML = `<i class="fas fa-calendar-alt"></i> ${t.calendarTypeLabel}`;

    // Search & Filter elements
    const searchInputElem = $.getElementById('searchInput');
    if (searchInputElem) searchInputElem.placeholder = t.searchPlaceholder;

    const priorityFilterElem = $.getElementById('priorityFilter');
    if (priorityFilterElem) {
        const opts = priorityFilterElem.options;
        if (opts[0]) opts[0].textContent = t.filterAllPriorities;
        if (opts[1]) opts[1].textContent = t.filterHigh;
        if (opts[2]) opts[2].textContent = t.filterMedium;
        if (opts[3]) opts[3].textContent = t.filterLow;
    }

    const dateFilterElem = $.getElementById('dateFilter');
    if (dateFilterElem) {
        const opts = dateFilterElem.options;
        if (opts[0]) opts[0].textContent = t.filterAllDates;
        if (opts[1]) opts[1].textContent = t.filterToday;
        if (opts[2]) opts[2].textContent = t.filterThisWeek;
        if (opts[3]) opts[3].textContent = t.filterOverdue;
        if (opts[4]) opts[4].textContent = t.filterNoDate;
    }

    const tagFilterElem = $.getElementById('tagFilter');
    if (tagFilterElem) {
        const opts = tagFilterElem.options;
        if (opts[0]) opts[0].textContent = t.filterAllTags;
    }

    const tagInputElem = $.getElementById('tagInput');
    if (tagInputElem) tagInputElem.placeholder = t.tagPlaceholder;

    // Update existing task buttons
    updateTaskButtons(t);

    // Store current translations for modals
    window.translationsCurrent = t;
}

// Update all task buttons (Complete/Undo/Delete)
function updateTaskButtons(t) {
    const taskItems = $.querySelectorAll('.tasks-list li');
    taskItems.forEach(item => {
        const completeBtn = item.querySelector('.btn-success');
        const deleteBtn = item.querySelector('.btn-danger');
        const label = item.querySelector('label');
        
        if (completeBtn) {
            const isCompleted = item.classList.contains('uncompleted');
            completeBtn.innerHTML = isCompleted 
                ? `<i class="fas fa-undo"></i> ${t.taskUndo}`
                : `<i class="fas fa-check"></i> ${t.taskComplete}`;
        }
        if (deleteBtn) {
            deleteBtn.innerHTML = `<i class="fas fa-trash"></i> ${t.taskDelete}`;
        }
    });
}

// Initialize language toggle button
function initLanguageToggle() {
    const languageToggleBtn = $.getElementById('languageToggle');
    if (!languageToggleBtn) return;
    
    languageToggleBtn.addEventListener('click', () => {
        // Switch language
        currentLanguage = currentLanguage === 'en' ? 'fa' : 'en';
        
        // Update button aria-label
        const t = translations[currentLanguage];
        languageToggleBtn.setAttribute('aria-label', currentLanguage === 'en' ? t.langToggleAriaLabelEn : t.langToggleAriaLabelFa);
        languageToggleBtn.title = currentLanguage === 'en' ? t.langToggleAriaLabelEn : t.langToggleAriaLabelFa;
        
        // Update document lang attribute
        document.documentElement.lang = currentLanguage;
        
        // Update all texts
        updateTexts();
        
        // Update date display for new language
        updateDateDisplay();
    });
}

// Get current translation object
function getCurrentTranslations() {
    return translations[currentLanguage];
}

/**
 * Translate a string key
 * @param {string} key - Translation key
 * @returns {string} - Translated string
 */
function translate(key) {
    return translations[currentLanguage][key] || key;
}

/**
 * Update modal text to use current language
 */
function updateModalTexts() {
    const t = translations[currentLanguage];
    window.modalTranslations = t;
}

// Initialize language support
initLanguageToggle();
updateModalTexts();
updateTexts();

// Initialize the application
init();