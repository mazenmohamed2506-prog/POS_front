<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-center gap-2">
        <Checkbox v-model="value" :binary="true" :inputId="name" />
        <label v-if="label" :for="name" class="font-medium text-surface-900 dark:text-surface-0 cursor-pointer">{{ label }}</label>
    </div>
    <span class="text-red-500 text-sm" v-if="errorMessage"> {{ errorMessage }} </span>
  </div>
</template>
<script setup>
import { useField } from 'vee-validate';

  const props = defineProps({
    name: String,
    label: String,
  });
  const { value, errorMessage } = useField(() => props.name);
</script>