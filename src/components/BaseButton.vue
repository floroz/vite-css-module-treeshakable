<template>
  <button :class="styles.btn">Test</button>
</template>

<script setup lang="ts">
import styles from "./BaseButton.module.css";

type Props = {
  test: string;
};

defineProps<Props>();
</script>
