import { jest } from "@jest/globals";
import { BaseEnhancer, EnhancerPriority } from "../../../src/enhancers/base-enhancer.js";
import { EnhancedResponse, ResponseFactory } from "../../../src/core/enhanced-response.js";

// Create a test enhancer implementation
class TestEnhancer extends BaseEnhancer {
  constructor(config = {}) {
    super({
      name: "TestEnhancer",
      description: "Test enhancer for unit tests",
      priority: EnhancerPriority.MEDIUM,
      dependencies: ["DependencyEnhancer"],
      ...config
    });
  }

  async enhance(response, context) {
    if (!this.canEnhance(response, context)) {
      return response;
    }
    response.addMetadata("enhanced", true);
    response.addMetadata("enhancerName", this.name);
    return response;
  }
}

describe("BaseEnhancer", () => {
  let enhancer;

  beforeEach(() => {
    enhancer = new TestEnhancer();
  });

  describe("constructor", () => {
    it("should initialize with default values", () => {
      expect(enhancer.name).toBe("TestEnhancer");
      expect(enhancer.priority).toBe(EnhancerPriority.MEDIUM);
      expect(enhancer.enabled).toBe(true);
      expect(enhancer.dependencies).toEqual(["DependencyEnhancer"]);
    });

    it("should accept custom configuration", () => {
      const customEnhancer = new TestEnhancer({
        priority: EnhancerPriority.HIGH,
        enabled: false,
        dependencies: ["CustomDep"],
        config: { customOption: "test" }
      });
      
      expect(customEnhancer.priority).toBe(EnhancerPriority.HIGH);
      expect(customEnhancer.enabled).toBe(false);
      expect(customEnhancer.dependencies).toEqual(["CustomDep"]);
      expect(customEnhancer.config.customOption).toBe("test");
    });

    it("should initialize with empty config", () => {
      expect(enhancer.config).toBeDefined();
      expect(enhancer.config).toEqual({});
    });

    it("should set metadata", () => {
      expect(enhancer.metadata).toBeDefined();
      expect(enhancer.metadata.description).toBe("Test enhancer for unit tests");
      expect(enhancer.metadata.version).toBe("1.0.0");
      expect(enhancer.metadata.author).toBe("");
    });
  });

  describe("enable/disable", () => {
    it("should enable the enhancer", () => {
      enhancer.setEnabled(false);
      expect(enhancer.enabled).toBe(false);
      
      enhancer.enable();
      expect(enhancer.enabled).toBe(true);
    });

    it("should disable the enhancer", () => {
      expect(enhancer.enabled).toBe(true);
      
      enhancer.disable();
      expect(enhancer.enabled).toBe(false);
    });

    it("should toggle enabled state", () => {
      const initialState = enhancer.enabled;
      
      enhancer.setEnabled(!initialState);
      expect(enhancer.enabled).toBe(!initialState);
      
      enhancer.setEnabled(initialState);
      expect(enhancer.enabled).toBe(initialState);
    });
  });

  describe("canEnhance", () => {
    it("should return true when enabled and response is valid", () => {
      const response = new EnhancedResponse({ message: "test" });
      const context = {};
      
      expect(enhancer.canEnhance(response, context)).toBe(true);
    });

    it("should return false when disabled", () => {
      const response = new EnhancedResponse({ message: "test" });
      const context = {};
      
      enhancer.disable();
      expect(enhancer.canEnhance(response, context)).toBe(false);
    });

    it("should return false when response is null", () => {
      expect(enhancer.canEnhance(null, {})).toBe(false);
    });

    it("should return false when response is not an EnhancedResponse", () => {
      const notAResponse = { message: "test" };
      expect(enhancer.canEnhance(notAResponse, {})).toBe(false);
    });
  });

  describe("validate", () => {
    it("should validate response and context", () => {
      const response = new EnhancedResponse({ message: "test" });
      const context = { user: "test" };
      
      const result = enhancer.validate(response, context);
      expect(result.isSuccess()).toBe(true);
    });

    it("should return error for invalid response", () => {
      const result1 = enhancer.validate(null, {});
      expect(result1.isSuccess()).toBe(false);
      
      const result2 = enhancer.validate("not a response", {});
      expect(result2.isSuccess()).toBe(false);
    });

    it("should accept null context", () => {
      const response = new EnhancedResponse({ message: "test" });
      const result = enhancer.validate(response, null);
      expect(result.isSuccess()).toBe(true);
    });
  });


  describe("getMetadata", () => {
    it("should return enhancer metadata", () => {
      const metadata = enhancer.getMetadata();
      
      expect(metadata).toBeDefined();
      expect(metadata.name).toBe("TestEnhancer");
      expect(metadata.enabled).toBe(true);
      expect(metadata.priority).toBe(EnhancerPriority.MEDIUM);
      expect(metadata.dependencies).toEqual(["DependencyEnhancer"]);
      expect(metadata.description).toBe("Test enhancer for unit tests");
    });

    it("should include current state", () => {
      enhancer.disable();
      
      const metadata = enhancer.getMetadata();
      
      expect(metadata.enabled).toBe(false);
    });
  });

  describe("configuration", () => {
    it("should update configuration", () => {
      enhancer.config.testOption = "value";
      expect(enhancer.config.testOption).toBe("value");
    });

    it("should preserve metadata updates", () => {
      enhancer.metadata.customField = "custom";
      expect(enhancer.metadata.customField).toBe("custom");
    });
  });

  describe("EnhancerPriority", () => {
    it("should have correct priority values", () => {
      expect(EnhancerPriority.HIGHEST).toBe(100);
      expect(EnhancerPriority.HIGH).toBe(80);
      expect(EnhancerPriority.MEDIUM).toBe(50);
      expect(EnhancerPriority.LOW).toBe(20);
      expect(EnhancerPriority.LOWEST).toBe(0);
    });
  });

  describe("error handling", () => {
    it("should handle errors in canEnhance gracefully", () => {
      const badResponse = {
        toString() { throw new Error("Bad response"); }
      };
      
      expect(enhancer.canEnhance(badResponse, {})).toBe(false);
    });
  });

  describe("enhance method", () => {
    it("should enhance response when can enhance", async () => {
      const response = new EnhancedResponse({ message: "test" });
      const enhanced = await enhancer.enhance(response, {});
      
      expect(enhanced.metadata.enhanced).toBe(true);
      expect(enhanced.metadata.enhancerName).toBe("TestEnhancer");
    });

    it("should not enhance when cannot enhance", async () => {
      const response = new EnhancedResponse({ message: "test" });
      enhancer.disable();
      
      const enhanced = await enhancer.enhance(response, {});
      
      expect(enhanced.metadata.enhanced).toBeUndefined();
      expect(enhanced.metadata.enhancerName).toBeUndefined();
    });
  });
});