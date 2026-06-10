// // Constants
// const FORMAT_STRING = "dd-MM-yyyy";
// const SEPARATOR_REGEX = /[\/\-\.]/g;

// // Helper to detect separator from format string
// const getSeparator = (formatString) => {
//     // Use indexed access for faster check than includes()
//     const len = formatString.length;
//     for (let i = 0; i < len; i++) {
//         const char = formatString[i];
//         if (char === '/') return '/';
//         if (char === '-') return '-';
//         if (char === '.') return '.';
//     }
//     return '/'; // default
// };

// // Helper to convert format string to toLocaleDateString options
// const parseFormatString = (formatString) => {
//     const options = {};

//     // Parse day format (check dd before d)
//     if (formatString.includes('dd')) {
//         options.day = '2-digit';
//     } else if (formatString.includes('d')) {
//         options.day = 'numeric';
//     }

//     // Parse month format (check longest first)
//     if (formatString.includes('MMMM')) {
//         options.month = 'long';
//     } else if (formatString.includes('MMM')) {
//         options.month = 'short';
//     } else if (formatString.includes('MM')) {
//         options.month = '2-digit';
//     } else if (formatString.includes('M')) {
//         options.month = 'numeric';
//     }

//     // Parse year format
//     if (formatString.includes('yyyy')) {
//         options.year = 'numeric';
//     } else if (formatString.includes('yy')) {
//         options.year = '2-digit';
//     }
//     options.calendar = 'gregory';
//     return options;
// };

// // Detect if format is day-first or month-first
// const getIsDayFirst = (formatString) => {
//     const lowerFormat = formatString.toLowerCase();
//     const dayIndex = lowerFormat.indexOf('d');
//     const monthIndex = lowerFormat.indexOf('m');
//     return dayIndex !== -1 && monthIndex !== -1 && dayIndex < monthIndex;
// };

// // Pre-parse the format string once at module load
// const SEPARATOR = getSeparator(FORMAT_STRING);
// const DATE_OPTIONS = parseFormatString(FORMAT_STRING);
// const IS_DAY_FIRST = getIsDayFirst(FORMAT_STRING);
// // Freeze objects to prevent modifications and enable engine optimizations
// Object.freeze(DATE_OPTIONS);

// // Cache locale to avoid repeated localStorage reads
// let cachedLocale = null;
// let lastLocaleCheck = 0;
// const LOCALE_CACHE_DURATION = 1000; // 1 second cache

// const getLocale = () => {
//     const now = Date.now();
//     if (cachedLocale === null || (now - lastLocaleCheck) > LOCALE_CACHE_DURATION) {
//         cachedLocale = localStorage.getItem("selectedLocale");
//         lastLocaleCheck = now;
//     }
//     return cachedLocale;
// };

// export const formatDate = (date) => {
//     if (!date) return '';

//     const locale = getLocale();

//     // Clone options only if we need to modify (for Arabic calendar)
//     const dateOptions = locale === "ar" 
//         ? { ...DATE_OPTIONS, calendar: 'islamic' }
//         : DATE_OPTIONS;

//     const localeString = locale === "ar" ? "ar-SA" : (IS_DAY_FIRST ? "en-GB" : "en-US");

//     const newDate = new Date(date);
//     const formattedDate = newDate.toLocaleDateString(localeString, dateOptions);

//     // Replace separator in output with the desired separator
//     return formattedDate.replace(SEPARATOR_REGEX, SEPARATOR);
// };



import { useBaseStore } from "@/stores/base/baseStore";
// const baseStore = useBaseStore();
const monthNamesAr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const monthNamesEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthShortEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const toArabicNumerals = (str) => {
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return String(str).split('').map(char => {
        const digit = parseInt(char);
        return isNaN(digit) ? char : arabicNumerals[digit];
    }).join('');
};

const getEffectiveLocale = () => {
    const numberLocale = "native";
    //const numberLocale = baseStore.entityConfiguration?.numberAppearance;
    if (!numberLocale || numberLocale === "native") {
        return localStorage.getItem("selectedLocale") || "en";
    }
    return numberLocale;
};

export const formatDate = (date, formatStringInput = null, localeInput = null) => {
    if (!date) return '';
    const d = new Date(date);
    const locale = localeInput || getEffectiveLocale();
    const baseStore = useBaseStore();
    //let formatString = "dd/MM/yyyy";
    let formatString = formatStringInput || baseStore.entityConfiguration?.dateFormat || "dd/MM/yyyy";

    if (locale === "ar" && !formatString.includes(' ')) {
        formatString = formatString.split('').reverse().join('');
    }

    const day = d.getDate();
    const month = d.getMonth() + 1;
    const monthIndex = d.getMonth();
    const year = d.getFullYear();

    const monthLong = locale === "ar" ? monthNamesAr[monthIndex] : monthNamesEn[monthIndex];
    const monthShort = locale === "ar" ? monthNamesAr[monthIndex] : monthShortEn[monthIndex];

    let result = formatString
        .replace('MMMM', monthLong)
        .replace('MMM', monthShort)
        .replace('dd', String(day).padStart(2, '0'))
        .replace('d', String(day))
        .replace('MM', String(month).padStart(2, '0'))
        .replace('M', String(month))
        .replace('yyyy', String(year))
        .replace('yy', String(year).slice(-2));

    if (locale === "ar") {
        result = toArabicNumerals(result);
        result = result.replace(/,/g, '،');
    }
    return result;
};
export const formatTime = (date, formatStringInput = null) => {
    if (!date) return '';

    const d = new Date(date);
    const locale = getEffectiveLocale();
    const baseStore = useBaseStore();
    //const formatString = "HH:mm:ss";
    const formatString = formatStringInput || baseStore.entityConfiguration?.timeFormat || "HH:mm:ss";

    const hours24 = d.getHours();
    const hours12 = hours24 % 12 || 12;
    const minutes = d.getMinutes();
    const seconds = d.getSeconds();
    const ampm = hours24 >= 12 ? 'PM' : 'AM';
    const ampmAr = hours24 >= 12 ? 'م' : 'ص';

    let result = formatString
        .replace('HH', String(hours24).padStart(2, '0'))
        .replace('hh', String(hours12).padStart(2, '0'))
        .replace('mm', String(minutes).padStart(2, '0'))
        .replace('ss', String(seconds).padStart(2, '0'))
        .replace('tt', locale === "ar" ? ampmAr : ampm);

    if (locale === "ar") {
        result = toArabicNumerals(result);
    }
    return result;
};

export const formatNumber = (number, formatStringInput = null) => {
    if (number === null || number === undefined || number === '') return '';

    const n = parseFloat(number);
    if (isNaN(n)) return '';

    const locale = getEffectiveLocale();
    //const formatString = formatStringInput || baseStore.entityConfiguration?.numberFormat || "#,##0.00";
    const formatString = "#,##0.00";

    const hasThousandsSeparator = formatString.includes(',') || formatString.includes(' ');
    const thousandsSeparator = formatString.includes(',') ? ',' : ' ';
    const decimalCount = formatString.includes('.')
        ? formatString.split('.')[1]?.replace(/[^0#]/g, '').length || 0
        : 0;

    const parts = Math.abs(n).toFixed(decimalCount).split('.');
    let integerPart = parts[0];
    const decimalPart = parts[1];

    if (hasThousandsSeparator) {
        integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
    }

    let result = decimalCount > 0 ? `${integerPart}.${decimalPart}` : integerPart;

    if (n < 0) result = `-${result}`;

    if (locale === "ar") {
        result = toArabicNumerals(result);
        if (thousandsSeparator === ',') {
            result = result.replace(/,/g, '،');
        }
    }

    return result;
};

export const extractBirthDateFromNationalId = (nationalId) => {
    if (!nationalId || nationalId.length !== 14) return null;

    const century = nationalId.charAt(0);
    const year = nationalId.substring(1, 3);
    const month = nationalId.substring(3, 5);
    const day = nationalId.substring(5, 7);

    // Check century (2 = 1900-1999, 3 = 2000-2099)
    if (century !== '2' && century !== '3') return null;

    const fullYear = (century === '2' ? 1900 : 2000) + parseInt(year);
    const monthIndex = parseInt(month) - 1;
    const dayNum = parseInt(day);

    // Strict date validation
    const date = new Date(fullYear, monthIndex, dayNum);
    if (
        !isNaN(date.getTime()) &&
        date.getFullYear() === fullYear &&
        date.getMonth() === monthIndex &&
        date.getDate() === dayNum
    ) {
        return date;
    }

    return null;
};

export const extractGenderFromNationalId = (nationalId) => {
    if (!nationalId || nationalId.length !== 14) return null;

    const genderDigit = parseInt(nationalId.charAt(12));
    if (isNaN(genderDigit)) return null;

    // Odd = Male (1), Even = Female (2)
    return genderDigit % 2 !== 0 ? 1 : 2;
};
export const getFullName = (entity) => {
    console.log(entity);
    return entity.firstName + " " + entity.middleName + " " + entity.lastName;
};
