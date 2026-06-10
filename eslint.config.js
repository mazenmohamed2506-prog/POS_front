import globals from "globals";
import pluginVue from "eslint-plugin-vue";

export default [
  // add more generic rulesets here, such as:
  // js.configs.recommended,
  ...pluginVue.configs["flat/base"],
  ...pluginVue.configs["flat/essential"],
  ...pluginVue.configs["flat/recommended"],
  ...pluginVue.configs["flat/strongly-recommended"],
  {
    rules: {
      // override/add rules settings here, such as:
      // 'vue/no-unused-vars': 'error'
      "vue/max-attributes-per-line": [
        "error",
        {
          singleline: {
            max: 4,
          },
          multiline: {
            max: 1,
          },
        },
      ],
      "vue/attribute-hyphenation": ["error", "never"],
      "vue/singleline-html-element-content-newline": [
        "error",
        {
          ignoreWhenNoAttributes: true,
          ignoreWhenEmpty: true,
          ignores: ["pre", "textarea","p", ...INLINE_ELEMENTS],
          externalIgnores: [],
        },
      ],
    },
    languageOptions: {
      sourceType: "module",
      globals: {
        ...globals.browser,
      },
    },
  },
];
