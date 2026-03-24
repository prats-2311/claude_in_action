import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockSignInAction = vi.fn();
const mockSignUpAction = vi.fn();

vi.mock("@/actions", () => ({
  signIn: (...args: unknown[]) => mockSignInAction(...args),
  signUp: (...args: unknown[]) => mockSignUpAction(...args),
}));

const mockGetAnonWorkData = vi.fn();
const mockClearAnonWork = vi.fn();

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: () => mockGetAnonWorkData(),
  clearAnonWork: () => mockClearAnonWork(),
}));

const mockGetProjects = vi.fn();

vi.mock("@/actions/get-projects", () => ({
  getProjects: () => mockGetProjects(),
}));

const mockCreateProject = vi.fn();

vi.mock("@/actions/create-project", () => ({
  createProject: (...args: unknown[]) => mockCreateProject(...args),
}));

const { useAuth } = await import("@/hooks/use-auth");

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAnonWorkData.mockReturnValue(null);
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ id: "new-project-id" });
  });

  it("initializes with isLoading false", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(false);
  });

  it("exposes signIn, signUp, and isLoading", () => {
    const { result } = renderHook(() => useAuth());
    expect(typeof result.current.signIn).toBe("function");
    expect(typeof result.current.signUp).toBe("function");
    expect(typeof result.current.isLoading).toBe("boolean");
  });

  describe("signIn", () => {
    it("calls the signIn action with email and password", async () => {
      mockSignInAction.mockResolvedValue({ success: false, error: "Invalid credentials" });
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(mockSignInAction).toHaveBeenCalledWith("user@example.com", "password123");
    });

    it("returns the result from signIn action", async () => {
      const mockResult = { success: false, error: "Invalid credentials" };
      mockSignInAction.mockResolvedValue(mockResult);
      const { result } = renderHook(() => useAuth());

      let returnValue: unknown;
      await act(async () => {
        returnValue = await result.current.signIn("user@example.com", "wrong");
      });

      expect(returnValue).toEqual(mockResult);
    });

    it("sets isLoading to true while in flight, then false after", async () => {
      let resolveSignIn!: (v: unknown) => void;
      mockSignInAction.mockReturnValue(new Promise((res) => { resolveSignIn = res; }));

      const { result } = renderHook(() => useAuth());

      act(() => { result.current.signIn("user@example.com", "password"); });
      expect(result.current.isLoading).toBe(true);

      await act(async () => { resolveSignIn({ success: false }); });
      expect(result.current.isLoading).toBe(false);
    });

    it("resets isLoading to false even when signIn action throws", async () => {
      mockSignInAction.mockRejectedValue(new Error("Network error"));
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password").catch(() => {});
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("does not navigate when signIn fails", async () => {
      mockSignInAction.mockResolvedValue({ success: false, error: "Bad credentials" });
      const { result } = renderHook(() => useAuth());

      await act(async () => { await result.current.signIn("user@example.com", "wrong"); });

      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe("signUp", () => {
    it("calls the signUp action with email and password", async () => {
      mockSignUpAction.mockResolvedValue({ success: false, error: "Email taken" });
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("new@example.com", "password123");
      });

      expect(mockSignUpAction).toHaveBeenCalledWith("new@example.com", "password123");
    });

    it("returns the result from signUp action", async () => {
      const mockResult = { success: false, error: "Email taken" };
      mockSignUpAction.mockResolvedValue(mockResult);
      const { result } = renderHook(() => useAuth());

      let returnValue: unknown;
      await act(async () => {
        returnValue = await result.current.signUp("new@example.com", "password123");
      });

      expect(returnValue).toEqual(mockResult);
    });

    it("sets isLoading to true while in flight, then false after", async () => {
      let resolveSignUp!: (v: unknown) => void;
      mockSignUpAction.mockReturnValue(new Promise((res) => { resolveSignUp = res; }));

      const { result } = renderHook(() => useAuth());

      act(() => { result.current.signUp("new@example.com", "password"); });
      expect(result.current.isLoading).toBe(true);

      await act(async () => { resolveSignUp({ success: false }); });
      expect(result.current.isLoading).toBe(false);
    });

    it("resets isLoading to false even when signUp action throws", async () => {
      mockSignUpAction.mockRejectedValue(new Error("Network error"));
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("new@example.com", "password").catch(() => {});
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("does not navigate when signUp fails", async () => {
      mockSignUpAction.mockResolvedValue({ success: false, error: "Email taken" });
      const { result } = renderHook(() => useAuth());

      await act(async () => { await result.current.signUp("new@example.com", "password"); });

      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe("post-sign-in navigation — anonymous work exists", () => {
    const anonWork = {
      messages: [{ role: "user", content: "Make a button" }],
      fileSystemData: { "/": { type: "directory" }, "/App.tsx": { type: "file" } },
    };

    beforeEach(() => {
      mockGetAnonWorkData.mockReturnValue(anonWork);
      mockCreateProject.mockResolvedValue({ id: "migrated-project-id" });
    });

    it("creates a project with anonymous work after successful signIn", async () => {
      mockSignInAction.mockResolvedValue({ success: true });
      const { result } = renderHook(() => useAuth());

      await act(async () => { await result.current.signIn("user@example.com", "password"); });

      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/^Design from /),
        messages: anonWork.messages,
        data: anonWork.fileSystemData,
      });
    });

    it("clears anonymous work after migration", async () => {
      mockSignInAction.mockResolvedValue({ success: true });
      const { result } = renderHook(() => useAuth());

      await act(async () => { await result.current.signIn("user@example.com", "password"); });

      expect(mockClearAnonWork).toHaveBeenCalledOnce();
    });

    it("redirects to the migrated project after signIn", async () => {
      mockSignInAction.mockResolvedValue({ success: true });
      const { result } = renderHook(() => useAuth());

      await act(async () => { await result.current.signIn("user@example.com", "password"); });

      expect(mockPush).toHaveBeenCalledWith("/migrated-project-id");
    });

    it("does not call getProjects when anon work is present", async () => {
      mockSignInAction.mockResolvedValue({ success: true });
      const { result } = renderHook(() => useAuth());

      await act(async () => { await result.current.signIn("user@example.com", "password"); });

      expect(mockGetProjects).not.toHaveBeenCalled();
    });

    it("migrates anon work and redirects after successful signUp", async () => {
      mockSignUpAction.mockResolvedValue({ success: true });
      const { result } = renderHook(() => useAuth());

      await act(async () => { await result.current.signUp("new@example.com", "password"); });

      expect(mockCreateProject).toHaveBeenCalledOnce();
      expect(mockClearAnonWork).toHaveBeenCalledOnce();
      expect(mockPush).toHaveBeenCalledWith("/migrated-project-id");
    });
  });

  describe("post-sign-in navigation — anon work present but empty messages", () => {
    it("treats anon work with no messages as absent and falls through to getProjects", async () => {
      mockGetAnonWorkData.mockReturnValue({ messages: [], fileSystemData: {} });
      mockSignInAction.mockResolvedValue({ success: true });
      mockGetProjects.mockResolvedValue([{ id: "existing-project-id" }]);

      const { result } = renderHook(() => useAuth());
      await act(async () => { await result.current.signIn("user@example.com", "password"); });

      expect(mockCreateProject).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/existing-project-id");
    });
  });

  describe("post-sign-in navigation — no anonymous work, existing projects", () => {
    it("redirects to the most recent project after signIn", async () => {
      mockGetAnonWorkData.mockReturnValue(null);
      mockSignInAction.mockResolvedValue({ success: true });
      mockGetProjects.mockResolvedValue([
        { id: "recent-project" },
        { id: "older-project" },
      ]);

      const { result } = renderHook(() => useAuth());
      await act(async () => { await result.current.signIn("user@example.com", "password"); });

      expect(mockPush).toHaveBeenCalledWith("/recent-project");
      expect(mockCreateProject).not.toHaveBeenCalled();
    });

    it("redirects to the most recent project after signUp", async () => {
      mockGetAnonWorkData.mockReturnValue(null);
      mockSignUpAction.mockResolvedValue({ success: true });
      mockGetProjects.mockResolvedValue([{ id: "existing-project" }]);

      const { result } = renderHook(() => useAuth());
      await act(async () => { await result.current.signUp("new@example.com", "password"); });

      expect(mockPush).toHaveBeenCalledWith("/existing-project");
    });
  });

  describe("post-sign-in navigation — no anonymous work, no existing projects", () => {
    it("creates a new project and redirects after signIn", async () => {
      mockGetAnonWorkData.mockReturnValue(null);
      mockSignInAction.mockResolvedValue({ success: true });
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "brand-new-project" });

      const { result } = renderHook(() => useAuth());
      await act(async () => { await result.current.signIn("user@example.com", "password"); });

      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/^New Design #\d+$/),
        messages: [],
        data: {},
      });
      expect(mockPush).toHaveBeenCalledWith("/brand-new-project");
    });

    it("creates a new project and redirects after signUp", async () => {
      mockGetAnonWorkData.mockReturnValue(null);
      mockSignUpAction.mockResolvedValue({ success: true });
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "brand-new-project" });

      const { result } = renderHook(() => useAuth());
      await act(async () => { await result.current.signUp("new@example.com", "password"); });

      expect(mockCreateProject).toHaveBeenCalledOnce();
      expect(mockPush).toHaveBeenCalledWith("/brand-new-project");
    });
  });
});
