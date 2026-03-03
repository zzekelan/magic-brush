import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("frontend app", () => {
  it("renders Magic Brush title", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Magic Brush/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});
