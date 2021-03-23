var __defProp = Object.defineProperty;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, {enumerable: true, configurable: true, writable: true, value}) : obj[key] = value;
var __assign = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (result) => {
      return result.done ? resolve(result.value) : Promise.resolve(result.value).then(fulfilled, rejected);
    };
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/lib/field-directive.ts
import {
  defaultFieldResolver,
  DirectiveLocation,
  GraphQLDirective,
  GraphQLInt,
  GraphQLList,
  GraphQLString
} from "graphql";
import {SchemaDirectiveVisitor} from "@graphql-tools/utils";

// src/lib/rate-limit-error.ts
var RateLimitError = class extends Error {
  constructor(message) {
    super(message);
    this.isRateLimitError = true;
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
};

// src/lib/get-graphql-rate-limiter.ts
import get from "lodash.get";
import ms from "ms";

// src/lib/in-memory-store.ts
var InMemoryStore = class {
  constructor() {
    this.state = {};
  }
  setForIdentity(identity, timestamps) {
    this.state = __assign(__assign({}, this.state || {}), {
      [identity.contextIdentity]: __assign(__assign({}, this.state[identity.contextIdentity] || {}), {
        [identity.fieldIdentity]: [...timestamps]
      })
    });
  }
  getForIdentity(identity) {
    const ctxState = this.state[identity.contextIdentity];
    return ctxState && ctxState[identity.fieldIdentity] || [];
  }
};

// src/lib/batch-request-cache.ts
var getNoOpCache = () => ({
  set: ({newTimestamps}) => newTimestamps
});
var getWeakMapCache = () => {
  const cache = new WeakMap();
  return {
    set: ({
      context,
      fieldIdentity,
      newTimestamps
    }) => {
      const currentCalls = cache.get(context) || {};
      currentCalls[fieldIdentity] = [
        ...currentCalls[fieldIdentity] || [],
        ...newTimestamps
      ];
      cache.set(context, currentCalls);
      return currentCalls[fieldIdentity];
    }
  };
};

// src/lib/get-graphql-rate-limiter.ts
var DEFAULT_WINDOW = 60 * 1e3;
var DEFAULT_MAX = 5;
var DEFAULT_FIELD_IDENTITY_ARGS = [];
var getFieldIdentity = (fieldName, identityArgs, resolveArgs) => {
  const argsKey = identityArgs.map((arg) => get(resolveArgs, arg));
  return [fieldName, ...argsKey].join(":");
};
var getGraphQLRateLimiter = (userConfig) => {
  const defaultConfig = {
    enableBatchRequestCache: false,
    formatError: ({fieldName}) => {
      return `You are trying to access '${fieldName}' too often`;
    },
    identifyContext: () => {
      throw new Error("You must implement a createRateLimitDirective.config.identifyContext");
    },
    store: new InMemoryStore()
  };
  const {enableBatchRequestCache, identifyContext, formatError, store} = __assign(__assign({}, defaultConfig), userConfig);
  const batchRequestCache = enableBatchRequestCache ? getWeakMapCache() : getNoOpCache();
  const rateLimiter = (_0, _1) => __async(void 0, [_0, _1], function* ({
    args,
    context,
    info
  }, {
    arrayLengthField,
    identityArgs,
    max,
    window,
    message
  }) {
    const contextIdentity = identifyContext(context);
    const windowMs = window ? ms(window) : DEFAULT_WINDOW;
    const fieldIdentity = getFieldIdentity(info.fieldName, identityArgs || DEFAULT_FIELD_IDENTITY_ARGS, args);
    const maxCalls = max || DEFAULT_MAX;
    const callCount = arrayLengthField && get(args, [arrayLengthField, "length"]) || 1;
    const identity = {contextIdentity, fieldIdentity};
    const timestamp = Date.now();
    const newTimestamps = [...new Array(callCount || 1)].map(() => timestamp);
    const batchedTimestamps = batchRequestCache.set({
      context,
      fieldIdentity,
      newTimestamps
    });
    const accessTimestamps = yield store.getForIdentity(identity);
    const filteredAccessTimestamps = [
      ...batchedTimestamps,
      ...accessTimestamps.filter((t) => {
        return t + windowMs > Date.now();
      })
    ];
    yield store.setForIdentity(identity, filteredAccessTimestamps, windowMs);
    const errorMessage = message || formatError({
      contextIdentity,
      fieldIdentity,
      fieldName: info.fieldName,
      max: maxCalls,
      window: windowMs
    });
    return filteredAccessTimestamps.length > maxCalls ? errorMessage : void 0;
  });
  return rateLimiter;
};

// src/lib/field-directive.ts
var createRateLimitDirective = (customConfig = {}) => {
  const rateLimiter = getGraphQLRateLimiter(customConfig);
  class GraphQLRateLimit extends SchemaDirectiveVisitor {
    static getDirectiveDeclaration(directiveName) {
      return new GraphQLDirective({
        args: {
          arrayLengthField: {
            type: GraphQLString
          },
          identityArgs: {
            type: new GraphQLList(GraphQLString)
          },
          max: {
            type: GraphQLInt
          },
          message: {
            type: GraphQLString
          },
          window: {
            type: GraphQLString
          }
        },
        locations: [DirectiveLocation.FIELD_DEFINITION],
        name: directiveName
      });
    }
    visitFieldDefinition(field) {
      const {resolve = defaultFieldResolver} = field;
      field.resolve = (parent, args, context, info) => __async(this, null, function* () {
        const errorMessage = yield rateLimiter({
          parent,
          args,
          context,
          info
        }, this.args);
        if (errorMessage) {
          throw new RateLimitError(errorMessage);
        }
        return resolve(parent, args, context, info);
      });
    }
  }
  return GraphQLRateLimit;
};

// src/lib/store.ts
var Store = class {
};

// src/lib/redis-store.ts
var RedisStore = class {
  constructor(redisStoreInstance) {
    this.nameSpacedKeyPrefix = "redis-store-id::";
    this.generateNamedSpacedKey = (identity) => {
      return `${this.nameSpacedKeyPrefix}${identity.contextIdentity}:${identity.fieldIdentity}`;
    };
    this.store = redisStoreInstance;
  }
  setForIdentity(identity, timestamps, windowMs) {
    return new Promise((res, rej) => {
      const expiry = windowMs ? [
        "EX",
        Math.ceil((Date.now() + windowMs - Math.max(...timestamps)) / 1e3)
      ] : [];
      this.store.set([
        this.generateNamedSpacedKey(identity),
        JSON.stringify([...timestamps]),
        ...expiry
      ], (err) => {
        if (err)
          return rej(err);
        return res();
      });
    });
  }
  getForIdentity(identity) {
    return __async(this, null, function* () {
      return new Promise((res, rej) => {
        this.store.get(this.generateNamedSpacedKey(identity), (err, obj) => {
          if (err) {
            return rej(err);
          }
          return res(obj ? JSON.parse(obj) : []);
        });
      });
    });
  }
};

// src/lib/rate-limit-shield-rule.ts
import {rule} from "graphql-shield";
var createRateLimitRule = (config) => {
  const noCacheRule = rule({cache: "no_cache"});
  const rateLimiter = getGraphQLRateLimiter(config);
  return (fieldConfig) => noCacheRule((parent, args, context, info) => __async(void 0, null, function* () {
    const errorMessage = yield rateLimiter({
      parent,
      args,
      context,
      info
    }, fieldConfig);
    return errorMessage ? new RateLimitError(errorMessage) : true;
  }));
};

// src/index.ts
var src_default = createRateLimitDirective;
export {
  InMemoryStore,
  RateLimitError,
  RedisStore,
  Store,
  createRateLimitDirective,
  createRateLimitRule,
  src_default as default,
  getFieldIdentity,
  getGraphQLRateLimiter
};
