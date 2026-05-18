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
function checkTableStructure() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🔍 Checking WalletTransaction table structure...\n');
        try {
            // We can use a raw query to describe the table in MySQL
            const result = yield prisma_1.default.$queryRawUnsafe('DESCRIBE wallettransaction');
            console.log('📊 Table Structure:');
            console.table(result);
        }
        catch (error) {
            console.error('\n❌ Error describing table:');
            console.error(error.message);
        }
        finally {
            yield prisma_1.default.$disconnect();
        }
    });
}
checkTableStructure();
