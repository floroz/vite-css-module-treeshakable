<template>
  <div :class="$style.modal">Test</div>
</template>

<style module lang="scss">
@import "../variables";
.modal {
  color: blue;
  background-color: $test;
  @extend %btn;
}
</style>
