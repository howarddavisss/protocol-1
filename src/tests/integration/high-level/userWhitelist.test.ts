import { createQuantity } from '@melonproject/token-math';
import { Environment, Tracks } from '~/utils/environment/Environment';
import { deployAndInitTestEnv } from '../../utils/deployAndInitTestEnv';
import { setupInvestedTestFund } from '~/tests/utils/setupInvestedTestFund';
import { getTokenBySymbol } from '~/utils/environment/getTokenBySymbol';
import { toBeTrueWith } from '~/tests/utils/toBeTrueWith';
import { FunctionSignatures } from '~/contracts/fund/trading/utils/FunctionSignatures';
import { register } from '~/contracts/fund/policies/transactions/register';
import { requestInvestment } from '~/contracts/fund/participation/transactions/requestInvestment';
import { approve } from '~/contracts/dependencies/token/transactions/approve';
import { getToken } from '~/contracts/dependencies/token/calls/getToken';
import { withDifferentAccount } from '~/utils/environment/withDifferentAccount';
import { transfer } from '~/contracts/dependencies/token/transactions/transfer';
import { deployUserWhitelist } from '~/contracts/fund/policies/compliance/transactions/deployUserWhitelist';

import { Contracts } from '~/Contracts';
import { getContract } from '~/utils/solidity/getContract';
import { BigNumber } from 'bignumber.js';

expect.extend({ toBeTrueWith });

describe('Happy Path', () => {
  const shared: {
    env?: Environment;
    [p: string]: any;
  } = {};

  beforeAll(async () => {
    shared.env = await deployAndInitTestEnv();
    expect(shared.env.track).toBe(Tracks.TESTING);
    shared.accounts = await shared.env.eth.getAccounts();
    shared.anotherAccount = withDifferentAccount(
      shared.env,
      shared.accounts[1],
    );
    shared.engine = shared.env.deployment.melonContracts.engine;
    shared.routes = await setupInvestedTestFund(shared.env);
    shared.weth = getTokenBySymbol(shared.env, 'WETH');
    shared.mln = getTokenBySymbol(shared.env, 'MLN');

    shared.user = shared.env.wallet.address;

    const wethToken = shared.env.deployment.thirdPartyContracts.tokens.find(
      x => x.symbol === 'WETH',
    );
    shared.wethInterface = getContract(
      shared.env,
      Contracts.Weth,
      wethToken.address,
    );

    shared.participation = getContract(
      shared.env,
      Contracts.Participation,
      shared.routes.participationAddress.toString(),
    );

    const userWhitelist = await deployUserWhitelist(shared.env, [
      shared.accounts[0],
    ]);

    await register(shared.env, shared.routes.policyManagerAddress, {
      method: FunctionSignatures.requestInvestment,
      policy: userWhitelist,
    });
  });

  test('Request investment fails if user is not whitelisted', async () => {
    const investmentAmount = createQuantity(shared.weth, 1);
    const fundToken = await getToken(shared.env, shared.routes.sharesAddress);

    await transfer(shared.env, {
      howMuch: investmentAmount,
      to: shared.accounts[1],
    });

    await approve(shared.anotherAccount, {
      howMuch: investmentAmount,
      spender: shared.routes.participationAddress,
    });

    await expect(
      requestInvestment(
        shared.anotherAccount,
        shared.routes.participationAddress,
        {
          investmentAmount,
          requestedShares: createQuantity(fundToken, 1),
        },
      ),
    ).rejects.toThrow();
  });

  test('Request investment passes if user is whitelisted', async () => {
    const investmentAmount = new BigNumber('1e+18').toString();
    const requestedShares = new BigNumber('1e+18').toString();
    const investmentAsset = shared.routes.sharesAddress.toString();
    const participationAddress = shared.routes.participationAddress.toString();

    await shared.wethInterface.methods
      .approve(participationAddress, investmentAmount)
      .send({ from: shared.user, gas: 8000000 });

    await expect(
      shared.participation.methods
        .requestInvestment(requestedShares, investmentAmount, investmentAsset)
        .send({ from: shared.user, gas: 8000000 }),
    ).resolves.not.toThrow();
  });
});
