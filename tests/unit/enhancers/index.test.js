import { jest } from "@jest/globals";

// Mock enhancer registry
const mockClear = jest.fn();
const mockRegister = jest.fn();
const mockCreatePipeline = jest.fn();
const mockGetPipeline = jest.fn();
const mockProcess = jest.fn();

const mockRegistry = {
  clear: mockClear,
  register: mockRegister,
  createPipeline: mockCreatePipeline,
  getPipeline: mockGetPipeline,
};

// Make register chainable
mockRegister.mockReturnValue(mockRegistry);

// Mock pipeline
const mockPipeline = {
  process: mockProcess,
};
mockGetPipeline.mockReturnValue(mockPipeline);
mockProcess.mockImplementation(async (response) => response);

jest.unstable_mockModule("../../../src/enhancers/enhancer-registry.js", () => ({
  EnhancerRegistry: jest.fn(() => mockRegistry),
  defaultRegistry: mockRegistry,
}));

// Mock core enhancers
const mockMetadataEnhancer = jest.fn();
const mockSuggestionsEnhancer = jest.fn();
const mockRiskAssessmentEnhancer = jest.fn();
const mockTeamActivityEnhancer = jest.fn();

jest.unstable_mockModule("../../../src/enhancers/core/metadata-enhancer.js", () => ({
  MetadataEnhancer: mockMetadataEnhancer,
}));

jest.unstable_mockModule("../../../src/enhancers/core/suggestions-enhancer.js", () => ({
  SuggestionsEnhancer: mockSuggestionsEnhancer,
}));

jest.unstable_mockModule("../../../src/enhancers/core/risk-assessment-enhancer.js", () => ({
  RiskAssessmentEnhancer: mockRiskAssessmentEnhancer,
}));

jest.unstable_mockModule("../../../src/enhancers/core/team-activity-enhancer.js", () => ({
  TeamActivityEnhancer: mockTeamActivityEnhancer,
}));

// Import after mocking
const {
  initializeDefaultEnhancers,
  createCustomPipeline,
  enhance,
  BaseEnhancer,
  EnhancerPriority,
  EnhancerPipeline,
  EnhancerRegistry,
  defaultRegistry,
  MetadataEnhancer,
  SuggestionsEnhancer,
  RiskAssessmentEnhancer,
  TeamActivityEnhancer,
} = await import("../../../src/enhancers/index.js");

describe("Enhancer Index", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("exports", () => {
    it("should export all required components", () => {
      expect(BaseEnhancer).toBeDefined();
      expect(EnhancerPriority).toBeDefined();
      expect(EnhancerPipeline).toBeDefined();
      expect(EnhancerRegistry).toBeDefined();
      expect(defaultRegistry).toBeDefined();
      expect(MetadataEnhancer).toBeDefined();
      expect(SuggestionsEnhancer).toBeDefined();
      expect(RiskAssessmentEnhancer).toBeDefined();
      expect(TeamActivityEnhancer).toBeDefined();
      expect(initializeDefaultEnhancers).toBeDefined();
      expect(createCustomPipeline).toBeDefined();
      expect(enhance).toBeDefined();
    });
  });

  describe("initializeDefaultEnhancers", () => {
    it("should register all default enhancers", async () => {
      await initializeDefaultEnhancers();

      expect(mockRegister).toHaveBeenCalledWith(mockMetadataEnhancer, expect.any(Object));
      expect(mockRegister).toHaveBeenCalledWith(mockSuggestionsEnhancer, expect.any(Object));
      expect(mockRegister).toHaveBeenCalledWith(mockRiskAssessmentEnhancer, expect.any(Object));
      expect(mockRegister).toHaveBeenCalledWith(mockTeamActivityEnhancer, expect.any(Object));
    });

    it("should create default pipeline", async () => {
      await initializeDefaultEnhancers();

      expect(mockCreatePipeline).toHaveBeenCalledWith("default", {
        parallel: false,
        continueOnError: true,
        timeout: 5000,
      });
    });

    it("should return the registry", async () => {
      const result = await initializeDefaultEnhancers();
      expect(result).toBe(mockRegistry);
    });

    it("should accept custom registry", async () => {
      const customRegistry = {
        register: jest.fn().mockReturnThis(),
        createPipeline: jest.fn(),
      };

      await initializeDefaultEnhancers(customRegistry);

      expect(customRegistry.register).toHaveBeenCalled();
      expect(customRegistry.createPipeline).toHaveBeenCalled();
    });
  });

  describe("createCustomPipeline", () => {
    it("should create pipeline with specified enhancers", () => {
      const enhancerNames = ["MetadataEnhancer", "SuggestionsEnhancer"];
      const result = createCustomPipeline(enhancerNames);

      expect(mockCreatePipeline).toHaveBeenCalledWith(
        expect.stringMatching(/^custom-\d+$/),
        expect.objectContaining({
          enhancers: enhancerNames,
        })
      );
    });

    it("should use custom name if provided", () => {
      const enhancerNames = ["MetadataEnhancer"];
      const options = { name: "my-pipeline" };

      createCustomPipeline(enhancerNames, options);

      expect(mockCreatePipeline).toHaveBeenCalledWith(
        "my-pipeline",
        expect.objectContaining({
          enhancers: enhancerNames,
        })
      );
    });

    it("should pass through all options", () => {
      const enhancerNames = ["MetadataEnhancer"];
      const options = {
        name: "test-pipeline",
        parallel: true,
        timeout: 10000,
      };

      createCustomPipeline(enhancerNames, options);

      expect(mockCreatePipeline).toHaveBeenCalledWith("test-pipeline", {
        enhancers: enhancerNames,
        name: "test-pipeline",
        parallel: true,
        timeout: 10000,
      });
    });
  });

  describe("enhance", () => {
    it("should enhance response using default pipeline", async () => {
      const response = { data: "test" };
      const context = { operation: "test" };

      const result = await enhance(response, context);

      expect(mockGetPipeline).toHaveBeenCalledWith("default");
      expect(mockProcess).toHaveBeenCalledWith(response, context);
      expect(result).toBe(response);
    });

    it("should use empty context if not provided", async () => {
      const response = { data: "test" };

      await enhance(response);

      expect(mockProcess).toHaveBeenCalledWith(response, {});
    });

    it("should throw error if default pipeline not initialized", async () => {
      mockGetPipeline.mockReturnValueOnce(null);

      const response = { data: "test" };

      await expect(enhance(response)).rejects.toThrow(
        "Default pipeline not initialized. Call initializeDefaultEnhancers() first."
      );
    });
  });

  describe("integration", () => {
    it("should support full initialization and enhancement flow", async () => {
      // Initialize
      await initializeDefaultEnhancers();

      // Create custom pipeline
      const customPipeline = createCustomPipeline(["MetadataEnhancer"]);

      // Enhance response
      const response = { data: "test" };
      const enhanced = await enhance(response);

      expect(mockRegister).toHaveBeenCalled();
      expect(mockCreatePipeline).toHaveBeenCalled();
      expect(mockProcess).toHaveBeenCalled();
    });

    it("should support custom pipeline creation and usage", async () => {
      const enhancerNames = ["SuggestionsEnhancer", "RiskAssessmentEnhancer"];
      const options = {
        name: "custom-flow",
        parallel: true,
      };

      const pipeline = createCustomPipeline(enhancerNames, options);

      expect(mockCreatePipeline).toHaveBeenCalledWith("custom-flow", {
        enhancers: enhancerNames,
        name: "custom-flow",
        parallel: true,
      });
    });
  });
});