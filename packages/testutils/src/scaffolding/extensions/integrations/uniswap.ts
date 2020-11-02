import { BigNumberish } from 'ethers';
import { AddressLike, SignerWithAddress } from '@crestproject/crestproject';
import {
  callOnIntegrationArgs,
  ComptrollerLib,
  IntegrationManager,
  IntegrationManagerActionId,
  lendSelector,
  redeemSelector,
  StandardToken,
  takeOrderSelector,
  UniswapV2Adapter,
  uniswapV2LendArgs,
  uniswapV2RedeemArgs,
  uniswapV2TakeOrderArgs,
  VaultLib,
} from '@melonproject/protocol';

export async function uniswapV2Lend({
  comptrollerProxy,
  vaultProxy,
  integrationManager,
  fundOwner,
  uniswapV2Adapter,
  tokenA,
  tokenB,
  amountADesired,
  amountBDesired,
  amountAMin,
  amountBMin,
  incomingAsset,
  minIncomingAssetAmount,
  seedFund = false,
}: {
  comptrollerProxy: ComptrollerLib;
  vaultProxy: VaultLib;
  integrationManager: IntegrationManager;
  fundOwner: SignerWithAddress;
  uniswapV2Adapter: UniswapV2Adapter;
  tokenA: StandardToken;
  tokenB: StandardToken;
  amountADesired: BigNumberish;
  amountBDesired: BigNumberish;
  amountAMin: BigNumberish;
  amountBMin: BigNumberish;
  minIncomingAssetAmount: BigNumberish;
  incomingAsset: AddressLike;
  seedFund?: boolean;
}) {
  if (seedFund) {
    // Seed the VaultProxy with enough tokenA and tokenB for the tx
    await tokenA.transfer(vaultProxy, amountADesired);
    await tokenB.transfer(vaultProxy, amountBDesired);
  }

  const lendArgs = await uniswapV2LendArgs({
    tokenA,
    tokenB,
    amountADesired,
    amountBDesired,
    amountAMin,
    amountBMin,
    incomingAsset,
    minIncomingAssetAmount,
  });

  const callArgs = await callOnIntegrationArgs({
    adapter: uniswapV2Adapter,
    selector: lendSelector,
    encodedCallArgs: lendArgs,
  });

  const lendTx = comptrollerProxy
    .connect(fundOwner)
    .callOnExtension(
      integrationManager,
      IntegrationManagerActionId.CallOnIntegration,
      callArgs,
    );
  await expect(lendTx).resolves.toBeReceipt();

  return lendTx;
}

export async function uniswapV2Redeem({
  comptrollerProxy,
  integrationManager,
  fundOwner,
  uniswapV2Adapter,
  outgoingAsset,
  liquidity,
  tokenA,
  tokenB,
  amountAMin,
  amountBMin,
}: {
  comptrollerProxy: ComptrollerLib;
  integrationManager: IntegrationManager;
  fundOwner: SignerWithAddress;
  uniswapV2Adapter: UniswapV2Adapter;
  outgoingAsset: AddressLike;
  liquidity: BigNumberish;
  tokenA: AddressLike;
  tokenB: AddressLike;
  amountAMin: BigNumberish;
  amountBMin: BigNumberish;
}) {
  const redeemArgs = await uniswapV2RedeemArgs({
    outgoingAsset,
    liquidity,
    tokenA,
    tokenB,
    amountAMin,
    amountBMin,
  });
  const callArgs = await callOnIntegrationArgs({
    adapter: uniswapV2Adapter,
    selector: redeemSelector,
    encodedCallArgs: redeemArgs,
  });

  const redeemTx = comptrollerProxy
    .connect(fundOwner)
    .callOnExtension(
      integrationManager,
      IntegrationManagerActionId.CallOnIntegration,
      callArgs,
    );
  await expect(redeemTx).resolves.toBeReceipt();

  return redeemTx;
}

export async function uniswapV2TakeOrder({
  comptrollerProxy,
  vaultProxy,
  integrationManager,
  fundOwner,
  uniswapV2Adapter,
  path,
  outgoingAssetAmount,
  minIncomingAssetAmount,
  seedFund = false,
}: {
  comptrollerProxy: ComptrollerLib;
  vaultProxy: VaultLib;
  integrationManager: IntegrationManager;
  fundOwner: SignerWithAddress;
  uniswapV2Adapter: UniswapV2Adapter;
  path: StandardToken[];
  outgoingAssetAmount: BigNumberish;
  minIncomingAssetAmount: BigNumberish;
  seedFund?: boolean;
}) {
  if (seedFund) {
    // Seed the VaultProxy with enough outgoingAsset for the tx
    await path[0].transfer(vaultProxy, outgoingAssetAmount);
  }

  const takeOrderArgs = await uniswapV2TakeOrderArgs({
    path,
    outgoingAssetAmount,
    minIncomingAssetAmount,
  });
  const callArgs = await callOnIntegrationArgs({
    adapter: uniswapV2Adapter,
    selector: takeOrderSelector,
    encodedCallArgs: takeOrderArgs,
  });

  return comptrollerProxy
    .connect(fundOwner)
    .callOnExtension(
      integrationManager,
      IntegrationManagerActionId.CallOnIntegration,
      callArgs,
    );
}
