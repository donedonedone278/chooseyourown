// Registers @testing-library/jest-dom matchers (toBeInTheDocument, etc.) on
// Vitest's expect. Importing this only extends matchers — it doesn't touch the
// DOM — so it is safe to load for node-environment tests too.
import '@testing-library/jest-dom/vitest';
