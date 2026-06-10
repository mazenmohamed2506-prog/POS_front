import * as yup from "yup";

export const validateEmail = () => {
    return yup.string().email().required().matches(REGEX_PATTERNS.email);
};
export const validateName = () => {
    return yup
        .string()
        .required()
        .matches(REGEX_PATTERNS.name)
        .min(2)
        .max(100);
};
export const validateId = () => {
    return yup.string().required().matches(REGEX_PATTERNS.id);
};
export const validatePassword = () => {
    return yup.string().required().matches(REGEX_PATTERNS.password);
};
export const validatePasswordConfirmation = () => {
    return yup
        .string()
        .required()
        .oneOf([yup.ref("password")], "Passwords must match");
};
export const validateNumber = () => {
    return yup.number("يجب ادخال ارقام فقط").required("يجب ادخال رقم").min(0);
};
export const validateCode = () => {
    return yup.string().required("يجب ادخال كود").matches(REGEX_PATTERNS.code);
};
export const validateDate = () => {
    return yup.date().required().max(Date.now()); // Ensures the date is not in the future
};
export const validateBoolean = () => {
    return yup.boolean().required();
};
export const validateMobile = () => {
    return yup
        .string()
        .required("يجب ادخال الهاتف")
        .matches(REGEX_PATTERNS.mobile, "يجب ادخال رقم هاتف صالح");
};
export const validateText = () => {
    return yup
        .string()
        .required("يجب ادخال الاسم")
        .matches(REGEX_PATTERNS.name)
        .min(0)
        .max(255);
};

export const REGEX_PATTERNS = {
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    mobile: /^(\+|00)(?:(?!\+0)[0-9]){8,16}$|^(\+|00)(?:(?!\+0)[0-9]){9,17}$/,
    name: /^[a-zA-Z\u0621-\u064A\u0660-\u06690-9'/_ -]+$/,
    code: /^[a-zA-Z0-9/_-]+$/,
    userName: /^[a-zA-Z][a-zA-Z0-9_.]{2,15}$/,
    password: /^(?=.*[a-zA-Z])(?=.*[0-9]).{8,}$/,
    id: /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/,
    nationalId: /^[23]\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])(0[1-4]|[1-2][1-9]|3[1-5]|88)\d{5}$/,
};

export const validateNationalId = () => {
    return yup
        .string()
        .required("الرقم القومي مطلوب")
        .test("national-id-validation", "الرقم القومي غير صحيح", (val, context) => {
            if (!val) return true;

            const lengthRule = /^\d{14}$/;
            const startRule = /^[23]/;
            const yearRule = /^\d{2}$/; // Implied by overall structure, but specific check irrelevant if we check full string
            const monthRule = /^(0[1-9]|1[0-2])$/;
            const dayRule = /^(0[1-9]|[12]\d|3[01])$/;
            const governorateRule = /^(0[1-4]|[1-2][1-9]|3[1-5]|88)$/;

            if (!/^\d*$/.test(val)) {
                return context.createError({ message: "الرقم القومي يجب أن يحتوي على أرقام فقط" });
            }

            if (val.length !== 14) {
                return context.createError({ message: "الرقم القومي يجب أن يكون 14 رقم" });
            }

            if (!startRule.test(val)) {
                return context.createError({ message: "الرقم القومي يجب أن يبدأ بـ 2 أو 3" });
            }

            const month = val.substring(3, 5);
            if (!monthRule.test(month)) {
                return context.createError({ message: "شهر الميلاد غير صحيح (01-12)" });
            }

            const day = val.substring(5, 7);
            if (!dayRule.test(day)) {
                return context.createError({ message: "يوم الميلاد غير صحيح (01-31)" });
            }

            const governorate = val.substring(7, 9);
            if (!governorateRule.test(governorate)) {
                return context.createError({ message: "كود المحافظة غير صحيح" });
            }

            return true;
        });
};
