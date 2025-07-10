import { jest } from "@jest/globals";

// Mock base enhancer
const mockEnhancer = jest.fn();
const mockEnhancerInstance = {
  name: "TestEnhancer",
  priority: 50,
  enabled: true,
  enhance: jest.fn().mockImplementation(async (response) => response),
  setEnabled: jest.fn(),
  enable: jest.fn(),
  disable: jest.fn(),
};
mockEnhancer.mockImplementation(() => mockEnhancerInstance);

jest.unstable_mockModule("../../../src/enhancers/base-enhancer.js", () => ({
  BaseEnhancer: jest.fn(),
}));

// Import after mocking
const { EnhancerRegistry, defaultRegistry } = await import("../../../src/enhancers/enhancer-registry.js");

describe("EnhancerRegistry", () => {
  let registry;

  beforeEach(() => {
    jest.clearAllMocks();
    registry = new EnhancerRegistry();
  });

  describe("constructor", () => {
    it("should initialize with empty enhancers and pipelines", () => {
      expect(registry).toBeDefined();
      expect(registry.enhancers).toBeDefined();
      expect(registry.pipelines).toBeDefined();
    });

    it("should accept options", () => {
      const customRegistry = new EnhancerRegistry({
        defaultPipelineName: "custom",
        maxEnhancers: 10,
      });
      // EnhancerRegistry stores options in config, not options property
      expect(customRegistry.config.defaultPipelineName).toBe("custom");
      expect(customRegistry.config.maxEnhancers).toBe(10);
    });
  });

  describe("register", () => {
    it("should register an enhancer class", () => {
      const result = registry.register(mockEnhancer);
      
      expect(result).toBe(registry); // Should return this for chaining
      expect(registry.enhancers.has("TestEnhancer")).toBe(true);
    });

    it("should register with custom options", () => {
      registry.register(mockEnhancer, {
        enabled: false,
        config: { custom: "value" },
      });
      
      expect(mockEnhancer).toHaveBeenCalledWith({
        enabled: false,
        config: { custom: "value" },
      });
    });

    it("should handle registration errors", () => {
      const badEnhancer = jest.fn(() => {
        throw new Error("Registration failed");
      });

      expect(() => registry.register(badEnhancer)).toThrow();
    });

    it("should support method chaining", () => {
      const result = registry
        .register(mockEnhancer)
        .register(mockEnhancer, { enabled: false });
      
      expect(result).toBe(registry);
    });
  });

  describe("unregister", () => {
    beforeEach(() => {
      registry.register(mockEnhancer);
    });

    it("should unregister an enhancer", () => {
      expect(registry.enhancers.has("TestEnhancer")).toBe(true);
      
      registry.unregister("TestEnhancer");
      
      expect(registry.enhancers.has("TestEnhancer")).toBe(false);
    });

    it("should handle unregistering non-existent enhancer", () => {
      expect(() => registry.unregister("NonExistent")).not.toThrow();
    });
  });

  describe("getEnhancer", () => {
    beforeEach(() => {
      registry.register(mockEnhancer);
    });

    it("should return registered enhancer", () => {
      const enhancer = registry.getEnhancer("TestEnhancer");
      expect(enhancer).toBe(mockEnhancerInstance);
    });

    it("should return undefined for non-existent enhancer", () => {
      const enhancer = registry.getEnhancer("NonExistent");
      expect(enhancer).toBeUndefined();
    });
  });

  describe("getAllEnhancers", () => {
    it("should return empty array when no enhancers", () => {
      const enhancers = registry.getAllEnhancers();
      expect(enhancers).toEqual([]);
    });

    it("should return all registered enhancers", () => {
      registry.register(mockEnhancer);
      
      const enhancers = registry.getAllEnhancers();
      expect(enhancers).toHaveLength(1);
      expect(enhancers[0]).toBe(mockEnhancerInstance);
    });

    it("should filter by enabled status", () => {
      mockEnhancerInstance.enabled = true;
      registry.register(mockEnhancer);
      
      const enabledOnly = registry.getAllEnhancers(true);
      expect(enabledOnly).toHaveLength(1);
      
      mockEnhancerInstance.enabled = false;
      const stillEnabledOnly = registry.getAllEnhancers(true);
      expect(stillEnabledOnly).toHaveLength(0);
    });
  });

  describe("createPipeline", () => {
    beforeEach(() => {
      registry.register(mockEnhancer);
    });

    it("should create a new pipeline", () => {
      const pipeline = registry.createPipeline("test-pipeline");
      
      expect(pipeline).toBeDefined();
      expect(registry.pipelines.has("test-pipeline")).toBe(true);
    });

    it("should create pipeline with options", () => {
      const pipeline = registry.createPipeline("test-pipeline", {
        parallel: true,
        timeout: 5000,
      });
      
      expect(pipeline).toBeDefined();
    });

    it("should use all enhancers if none specified", () => {
      const pipeline = registry.createPipeline("test-pipeline");
      expect(pipeline).toBeDefined();
    });

    it("should create pipeline with specific enhancers", () => {
      const pipeline = registry.createPipeline("test-pipeline", {
        enhancers: ["TestEnhancer"],
      });
      
      expect(pipeline).toBeDefined();
    });

    it("should throw error for duplicate pipeline name", () => {
      registry.createPipeline("test-pipeline");
      
      expect(() => registry.createPipeline("test-pipeline")).toThrow();
    });
  });

  describe("getPipeline", () => {
    beforeEach(() => {
      registry.register(mockEnhancer);
      registry.createPipeline("test-pipeline");
    });

    it("should return existing pipeline", () => {
      const pipeline = registry.getPipeline("test-pipeline");
      expect(pipeline).toBeDefined();
    });

    it("should return undefined for non-existent pipeline", () => {
      const pipeline = registry.getPipeline("non-existent");
      expect(pipeline).toBeUndefined();
    });
  });

  describe("removePipeline", () => {
    beforeEach(() => {
      registry.register(mockEnhancer);
      registry.createPipeline("test-pipeline");
    });

    it("should remove existing pipeline", () => {
      expect(registry.pipelines.has("test-pipeline")).toBe(true);
      
      registry.removePipeline("test-pipeline");
      
      expect(registry.pipelines.has("test-pipeline")).toBe(false);
    });

    it("should handle removing non-existent pipeline", () => {
      expect(() => registry.removePipeline("non-existent")).not.toThrow();
    });
  });

  describe("clear", () => {
    beforeEach(() => {
      registry.register(mockEnhancer);
      registry.createPipeline("test-pipeline");
    });

    it("should clear all enhancers and pipelines", () => {
      expect(registry.enhancers.size).toBeGreaterThan(0);
      expect(registry.pipelines.size).toBeGreaterThan(0);
      
      registry.clear();
      
      expect(registry.enhancers.size).toBe(0);
      expect(registry.pipelines.size).toBe(0);
    });
  });

  describe("defaultRegistry", () => {
    it("should export a default registry instance", () => {
      expect(defaultRegistry).toBeDefined();
      expect(defaultRegistry).toBeInstanceOf(EnhancerRegistry);
    });
  });
});