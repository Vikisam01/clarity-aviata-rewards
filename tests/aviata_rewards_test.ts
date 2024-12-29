import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types
} from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
    name: "Can register new user",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const wallet = accounts.get('wallet_1')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('aviata-rewards', 'register-user', [], wallet.address)
        ]);
        
        block.receipts[0].result.expectOk().expectBool(true);
        
        let statusBlock = chain.mineBlock([
            Tx.contractCall('aviata-rewards', 'get-user-status', [
                types.principal(wallet.address)
            ], wallet.address)
        ]);
        
        statusBlock.receipts[0].result.expectOk().expectSome();
    }
});

Clarinet.test({
    name: "Can earn miles and update status",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const wallet = accounts.get('wallet_1')!;
        
        // Register user first
        let block = chain.mineBlock([
            Tx.contractCall('aviata-rewards', 'register-user', [], wallet.address),
            Tx.contractCall('aviata-rewards', 'earn-miles', [
                types.uint(30000) // Should achieve Silver status
            ], wallet.address)
        ]);
        
        block.receipts[1].result.expectOk().expectBool(true);
        
        // Check new balance
        let balanceBlock = chain.mineBlock([
            Tx.contractCall('aviata-rewards', 'get-balance', [
                types.principal(wallet.address)
            ], wallet.address)
        ]);
        
        assertEquals(balanceBlock.receipts[0].result.expectOk(), types.uint(30000));
        
        // Check new status
        let statusBlock = chain.mineBlock([
            Tx.contractCall('aviata-rewards', 'get-user-status', [
                types.principal(wallet.address)
            ], wallet.address)
        ]);
        
        let status = statusBlock.receipts[0].result.expectOk().expectSome();
        assertEquals(status['status-level'], "SILVER");
    }
});

Clarinet.test({
    name: "Can transfer miles between users",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;
        
        // Setup: Register users and earn miles
        let setup = chain.mineBlock([
            Tx.contractCall('aviata-rewards', 'register-user', [], wallet1.address),
            Tx.contractCall('aviata-rewards', 'register-user', [], wallet2.address),
            Tx.contractCall('aviata-rewards', 'earn-miles', [
                types.uint(10000)
            ], wallet1.address)
        ]);
        
        // Transfer miles
        let transfer = chain.mineBlock([
            Tx.contractCall('aviata-rewards', 'transfer-miles', [
                types.uint(5000),
                types.principal(wallet1.address),
                types.principal(wallet2.address)
            ], wallet1.address)
        ]);
        
        transfer.receipts[0].result.expectOk().expectBool(true);
        
        // Verify balances
        let balances = chain.mineBlock([
            Tx.contractCall('aviata-rewards', 'get-balance', [
                types.principal(wallet1.address)
            ], wallet1.address),
            Tx.contractCall('aviata-rewards', 'get-balance', [
                types.principal(wallet2.address)
            ], wallet2.address)
        ]);
        
        assertEquals(balances.receipts[0].result.expectOk(), types.uint(5000));
        assertEquals(balances.receipts[1].result.expectOk(), types.uint(5000));
    }
});