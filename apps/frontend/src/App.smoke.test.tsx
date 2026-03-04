import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("frontend app", () => {
  it("uses Magic Brush as document title", async () => {
    render(<App />);

    await waitFor(() => {
      expect(document.title).toContain("Magic Brush");
    }, { timeout: 5000 });
  });
});
