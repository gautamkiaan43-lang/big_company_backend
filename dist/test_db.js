"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("./utils/prisma"));
function test() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('STARTING TEST');
        try {
            const userCount = yield prisma_1.default.user.count();
            console.log('USER COUNT:', userCount);
            const consumer = yield prisma_1.default.consumerProfile.findFirst({
                where: { userId: 6 } // Kapil's user ID
            });
            console.log('CONSUMER:', consumer === null || consumer === void 0 ? void 0 : consumer.id, consumer === null || consumer === void 0 ? void 0 : consumer.fullName);
            if (consumer) {
                const link = yield prisma_1.default.customerLinkRequest.findUnique({
                    where: {
                        customerId_retailerId: {
                            customerId: consumer.id,
                            retailerId: 1
                        }
                    }
                });
                console.log('LINK REQUEST:', link);
            }
        }
        catch (err) {
            console.error('TEST ERROR:', err.message);
        }
        finally {
            yield prisma_1.default.$disconnect();
        }
    });
}
test();
