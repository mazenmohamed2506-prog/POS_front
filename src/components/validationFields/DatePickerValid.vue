<template>
    <div class="flex flex-col relative w-full gap-2">
        <label v-if="label" class="font-medium text-surface-900 dark:text-surface-0">{{ label }}</label>
        <DatePicker
            v-model="dateValue"
            :disabled="disabled"
            :show-time="showTime"
            :timeOnly="timeOnly"
            :minDate="minDate"
            :maxDate="maxDate"
            :placeholder="placeholder || label"
            :class="{ 'p-invalid': errorMessage }"
            fluid
        />
        <span class="text-red-500 absolute -bottom-6 start-0" v-if="errorMessage">
            {{ errorMessage }}
        </span>
    </div>
</template>
<script setup>
import { useField } from 'vee-validate';
import { computed } from 'vue';

const props = defineProps({
    name: String,
    label: String,
    showTime: Boolean,
    timeOnly: Boolean,
    disabled: Boolean,
    minDate: Date,
    maxDate: Date,
    placeholder: String,
});

const { value, errorMessage } = useField(() => props.name);

// Handle conversion between string/null and Date object
const dateValue = computed({
    get: () => {
        if (!value.value) return null;
        if (value.value instanceof Date) return value.value;
        
        // If it's a time string (HH:mm or HH:mm:ss)
        if (typeof value.value === 'string' && props.timeOnly) {
            const timeParts = value.value.split(':');
            if (timeParts.length >= 2) {
                const d = new Date();
                d.setHours(parseInt(timeParts[0], 10));
                d.setMinutes(parseInt(timeParts[1], 10));
                d.setSeconds(timeParts[2] ? parseInt(timeParts[2], 10) : 0);
                return d;
            }
        }

        // Date-only string (YYYY-MM-DD): parse as local date to avoid -1 day in other timezones
        if (typeof value.value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value.value)) {
            const [y, m, day] = value.value.split(/[-T]/).map(Number);
            if (!isNaN(y) && !isNaN(m) && !isNaN(day)) {
                const d = new Date(y, m - 1, day);
                return isNaN(d.getTime()) ? null : d;
            }
        }

        const d = new Date(value.value);
        return isNaN(d.getTime()) ? null : d;
    },
    set: (val) => {
        value.value = val;
    }
});
</script>
