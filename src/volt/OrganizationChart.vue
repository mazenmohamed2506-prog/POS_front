<template>
  <OrganizationChart
    v-bind="$props"
    unstyled
    :pt="theme"
    :ptOptions="{ mergeProps: ptViewMerge }"
  >
    <template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
      <slot :name="slotName" v-bind="slotProps ?? {}" />
    </template>
  </OrganizationChart>
</template>

<script setup lang="ts">
import OrganizationChart, {
  type OrganizationChartPassThroughOptions,
  type OrganizationChartProps,
} from "primevue/organizationchart";
import { ref } from "vue";
import { ptViewMerge } from "./utils"; // Ensure this path matches your project structure

interface Props extends /* @vue-ignore */ OrganizationChartProps {}
defineProps<Props>();

const theme = ref<OrganizationChartPassThroughOptions>({
  table: "mx-auto border-separate border-spacing-0 margin-0",
  cell: "text-center align-top py-0 px-2",
  node: {
    class: [
      "relative inline-block mx-2 mb-2", // Only bottom margin for toggle button spacing, no top margin so lines connect
      "transform transition-transform duration-200",
    ],
  },
  nodeContent: ({ context }) => ({
    class: [
      // Base Layout
      "p-4 border rounded-xl cursor-pointer relative z-10",
      "inline-flex flex-col items-center justify-center",
      "min-w-[10rem]", // Optional: Enforce a minimum width for consistency

      // Colors & Surfaces (Volt Style)
      "bg-surface-0 dark:bg-surface-800",
      "text-surface-600 dark:text-surface-0/80",

      // Borders & Shadows
      "border-surface-200 dark:border-surface-700",
      "shadow-sm hover:shadow-md",

      // Transitions
      "transition-all duration-200",

      // Selection States (High priority overrides)
      {
        "bg-primary-50 dark:bg-primary-400/10 border-primary-500 dark:border-primary-400 text-primary-600 dark:text-primary-300":
          context.selected,
        "hover:bg-surface-50 dark:hover:bg-surface-700":
          !context.selected && context.selectable,
      },
    ],
  }),
  nodeToggleButton: {
    class: [
      // Positioning (On the bottom line)
      "absolute bottom-[-0.75rem] left-1/2 -translate-x-1/2 z-20",

      // Shape & Size
      "w-6 h-6 rounded-full",
      "inline-flex items-center justify-center",

      // Interactive
      "cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-primary-500/50",

      // Colors (Primary Volt Action)
      "bg-primary-500 hover:bg-primary-600 text-white",
      "border-2 border-white dark:border-surface-900", // White border makes it "pop" off the line

      // Transition
      "transition-colors duration-200",
    ],
  },
  nodeToggleButtonIcon: "w-3 h-3", // Smaller icon fits better in a 6x6 circle

  // --- The Connectors (Critical for Visual Structure) ---
  connectors: "border-collapse",

  // Cell containing connectorDown
  lineCell: "text-center p-0",

  // The vertical line dropping down from a parent
  connectorDown: {
    class: "mx-auto bg-surface-300 dark:bg-surface-600",
    style: "height: 20px; width: 1px;",
  },

  // The cell connecting to the left sibling
  // border-e creates vertical line down to child, border-t creates horizontal line
  connectorLeft: ({ context }) => ({
    class: [
      "text-center align-top p-0",
      // Right/end border creates the vertical line going down
      "border-e border-solid border-surface-300 dark:border-surface-600",
      {
        // Top border for horizontal connection (except first child)
        "border-t border-solid": context.lineTop,
      },
    ],
  }),

  // The cell connecting to the right sibling
  connectorRight: ({ context }) => ({
    class: [
      "text-center align-top p-0",
      {
        // Top border for horizontal connection (except last child)
        "border-t border-solid border-surface-300 dark:border-surface-600":
          context.lineTop,
        // Left/start border on first child to create symmetry
        "border-s border-solid border-surface-300 dark:border-surface-600":
          !context.lineTop,
      },
    ],
  }),

  // Children row
  nodeChildren: "border-collapse",

  // Cell containing each child node
  nodeCell: "text-center align-top p-0",
});
</script>
