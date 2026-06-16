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
function checkTemplates() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🔍 Checking Email Templates in Database');
        try {
            const templates = yield prisma_1.default.emailTemplate.findMany();
            console.log(`Total templates found: ${templates.length}`);
            templates.forEach(t => {
                console.log(`- [${t.channel}] ID: ${t.name} (Active: ${t.isActive}, Version: ${t.version})`);
            });
        }
        catch (error) {
            console.error('Error fetching templates:', error);
        }
        finally {
            yield prisma_1.default.$disconnect();
        }
    });
}
checkTemplates();
