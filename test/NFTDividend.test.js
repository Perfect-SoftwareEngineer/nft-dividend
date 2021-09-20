const NFTDividend = artifacts.require("NFTDividend");
const MainErc721Mock = artifacts.require("MainErc721Mock");
const SecondaryERC721Mock = artifacts.require("SecondaryERC721Mock");

const {
    BN,           // Big Number support
    time,
    constants,    // Common constants, like the zero address and largest integers
    expectEvent,  // Assertions for emitted events
    expectRevert, // Assertions for transactions that should fail
} = require('@openzeppelin/test-helpers');

contract("NFTDividend", (accounts) => {
    var nftDividend_contract;
    var mainErc721Mock_contract;
    var secondaryErc721Mock_contract;

    before(async () => {
        nftDividend_contract = await NFTDividend.new({ from: accounts[0] });
        mainErc721Mock_contract = await MainErc721Mock.new("MainNFT", "MainNFT", { from: accounts[0] })
        secondaryErc721Mock_contract = await SecondaryERC721Mock.new(
            "SecondaryNFT", 
            "SecondaryNFT", 
            nftDividend_contract.address, 
            { from: accounts[0] }
        )

        nftDividend_contract.setMainContractAddress(mainErc721Mock_contract.address);
        nftDividend_contract.setSecondaryContractAddress(secondaryErc721Mock_contract.address);


        await mainErc721Mock_contract.safeMint(accounts[0], 1001);
        await mainErc721Mock_contract.safeMint(accounts[0], 1002);
        await mainErc721Mock_contract.safeMint(accounts[0], 1003);
        await mainErc721Mock_contract.safeMint(accounts[0], 1004);

        await secondaryErc721Mock_contract.safeMint(accounts[0], 2001);
        await secondaryErc721Mock_contract.safeMint(accounts[0], 2002);
        await secondaryErc721Mock_contract.safeMint(accounts[0], 2003);
        await secondaryErc721Mock_contract.safeMint(accounts[0], 2004);
    })

    describe("registerMainContactNFTs", () => {
        it("not working if not owner", async () => {
            const tokenIds = [1001, 10, 1003];
            const count = 3;

            let thrownError;

            try {
                await nftDividend_contract.registerMainContactNFTs(
                    tokenIds,
                    count,
                    { from: accounts[1]}
                )
            } catch(error) {
                thrownError = error;
            }
            assert.include(thrownError.message, "caller is not the owner");
        })

        it("not working if tokenIds not invalid", async () => {
            const tokenIds = [1001, 10, 1003];
            const count = 3;

            let thrownError;

            try {
                await nftDividend_contract.registerMainContactNFTs(
                    tokenIds,
                    count,
                    { from: accounts[0]}
                )
            } catch(error) {
                thrownError = error;
            }
            assert.include(thrownError.message, "tokenId invalid");
        })

        it("works well", async () => {
            const tokenIds = [1001, 1002, 1003];
            const count = 3;

            await nftDividend_contract.registerMainContactNFTs(
                tokenIds,
                count,
                { from: accounts[0]}
            )

            let res = await nftDividend_contract.mainTokenIdToNoShares(1001);
            assert.equal(res.toNumber(), 10);
            res = await nftDividend_contract.mainTokenIdToNoShares(1002);
            assert.equal(res.toNumber(), 10);
            res = await nftDividend_contract.mainTokenIdToNoShares(1003);
            assert.equal(res.toNumber(), 10);
        })
    })

    describe("registerSecondaryContractNFT", () => {
        it("not working if caller is not secondary contract", async () => {
            const tokenIds = [2001, 2002, 2003];
            const noShares = [10, 20, 30];
            const count = 3;
            let thrownError;

            try {
                await nftDividend_contract.registerSecondaryContractNFT(
                    tokenIds,
                    noShares,
                    count,
                    { from: accounts[0] }
                );
            } catch(error) {
                thrownError = error;
            }
            assert.include(thrownError.message, "only secondary contract");
        })

        it("not working if caller is not owner", async () => {
            const tokenIds = [3001, 3002, 3003];
            const noShares = [10, 20, 30];
            const count = 3;
            let thrownError;

            try {
                await secondaryErc721Mock_contract.registerSecondaryContractNFT(
                    tokenIds,
                    noShares,
                    count,
                    { from: accounts[1] }
                );
            } catch(error) {
                thrownError = error;
            }
            assert.include(thrownError.message, "owner query for nonexistent token");
        })

        it("works well", async () => {
            const tokenIds = [2001, 2002, 2003];
            const noShares = [10, 20, 30];
            const count = 3;

            await secondaryErc721Mock_contract.registerSecondaryContractNFT(
                tokenIds,
                noShares,
                count,
                { from: accounts[0] }
            );

            let res = await nftDividend_contract.secondaryTokenIdToNoShares(2001);
            assert.equal(res.toNumber(), 10);
            res = await nftDividend_contract.secondaryTokenIdToNoShares(2002);
            assert.equal(res.toNumber(), 20);
            res = await nftDividend_contract.secondaryTokenIdToNoShares(2003);
            assert.equal(res.toNumber(), 30);
        })
    })

    describe("depositFund", () => {
        it("only owner", async () => {
            let thrownError;

            try {
                await nftDividend_contract.depositFund({ from: accounts[1], value: 900 })
            } catch(error) {
                thrownError = error;
            }
            assert.include(thrownError.message, "caller is not the owner"); 
        })

        it("works well", async () => {
            await nftDividend_contract.depositFund({ from: accounts[0], value: 900 })

            const allocationPerShare = await nftDividend_contract.allocationPerShare();
            assert.equal(allocationPerShare.toNumber(), 10);
        })
    })

    describe("withdrawMainNFT", () => {
        it("not working if not owner", async () => {
            let thrownError;

            try {
                await nftDividend_contract.withdrawMainNFT(1001, {from: accounts[1]});
            } catch(error) {
                thrownError = error;
            }
            assert.include(thrownError.message, "not owner"); 
        })

        it("not working if tokenId not registered", async () => {
            let thrownError;

            try {
                await nftDividend_contract.withdrawMainNFT(1004, {from: accounts[0]});
            } catch(error) {
                thrownError = error;
            }
            assert.include(thrownError.message, "tokenId not registered"); 
        })

        it("works well", async () => {
            const prevBalance = new BN(await web3.eth.getBalance(nftDividend_contract.address));
            await nftDividend_contract.withdrawMainNFT(1001, {from: accounts[0]});
            const curBalance = new BN(await web3.eth.getBalance(nftDividend_contract.address));
            assert.equal(prevBalance.sub(curBalance).toNumber(), 100);
        })

        it("not working if already withdrawn", async () => {
            let thrownError;

            try {
                await nftDividend_contract.withdrawMainNFT(1001, {from: accounts[0]});
            } catch(error) {
                thrownError = error;
            }
            assert.include(thrownError.message, "already withdrawn"); 
        })
    })

    describe("withdrawSecondaryNFT", () => {
        it("not working if not owner", async () => {
            let thrownError;

            try {
                await nftDividend_contract.withdrawSecondaryNFT(2002, {from: accounts[1]});
            } catch(error) {
                thrownError = error;
            }
            assert.include(thrownError.message, "not owner"); 
        })

        it("not working if tokenId not registered", async () => {
            let thrownError;

            try {
                await nftDividend_contract.withdrawSecondaryNFT(2004, {from: accounts[0]});
            } catch(error) {
                thrownError = error;
            }
            assert.include(thrownError.message, "tokenId not registered"); 
        })

        it("works well", async () => {
            const prevBalance = new BN(await web3.eth.getBalance(nftDividend_contract.address));
            await nftDividend_contract.withdrawSecondaryNFT(2002, {from: accounts[0]});
            const curBalance = new BN(await web3.eth.getBalance(nftDividend_contract.address));
            assert.equal(prevBalance.sub(curBalance).toNumber(), 200);
        })

        it("not working if already withdrawn", async () => {
            let thrownError;

            try {
                await nftDividend_contract.withdrawSecondaryNFT(2002, {from: accounts[0]});
            } catch(error) {
                thrownError = error;
            }
            assert.include(thrownError.message, "already withdrawn"); 
        })
    })

    describe("withdrawArray", () => {
        it("not working if not owner", async () => {
            const mainTokenIds = [1002, 1003];
            const secondaryTokenIds = [2001, 2003];
            const mainTokenCount = 2;
            const secondaryTokenCount = 2;
            let thrownError;

            try {
                await nftDividend_contract.withdrawArray(
                    mainTokenIds,
                    secondaryTokenIds,
                    mainTokenCount,
                    secondaryTokenCount,
                    { from: accounts[1] }
                )
            } catch(error) {
                thrownError = error;
            }
            assert.include(thrownError.message, "not owner"); 
        })

        it("not working if tokenId is not registered", async () => {
            const mainTokenIds = [1002, 1003, 1004];
            const secondaryTokenIds = [2001, 2003, 2004];
            const mainTokenCount = 3;
            const secondaryTokenCount = 3;
            let thrownError;

            try {
                await nftDividend_contract.withdrawArray(
                    mainTokenIds,
                    secondaryTokenIds,
                    mainTokenCount,
                    secondaryTokenCount,
                    { from: accounts[0] }
                )
            } catch(error) {
                thrownError = error;
            }
            assert.include(thrownError.message, "tokenId is not registered"); 
        })

        it("works well", async () => {
            const mainTokenIds = [1002, 1003];
            const secondaryTokenIds = [2001, 2003];
            const mainTokenCount = 2;
            const secondaryTokenCount = 2;
            const prevBalance = new BN(await web3.eth.getBalance(nftDividend_contract.address));

            await nftDividend_contract.withdrawArray(
                mainTokenIds,
                secondaryTokenIds,
                mainTokenCount,
                secondaryTokenCount,
                { from: accounts[0] }
            )

            const curBalance = new BN(await web3.eth.getBalance(nftDividend_contract.address));
            assert.equal(prevBalance.sub(curBalance).toNumber(), 600);
        })

        it("not working if already withdrawn", async () => {
            const mainTokenIds = [1002, 1003];
            const secondaryTokenIds = [2001, 2003];
            const mainTokenCount = 2;
            const secondaryTokenCount = 2;
            let thrownError;

            try {
                await nftDividend_contract.withdrawArray(
                    mainTokenIds,
                    secondaryTokenIds,
                    mainTokenCount,
                    secondaryTokenCount,
                    { from: accounts[0] }
                )
            } catch(error) {
                thrownError = error;
            }
            assert.include(thrownError.message, "already withdrawn"); 
        })
    })

    describe("emergencyWithdraw", () => {
        it("works well", async () => {
            await nftDividend_contract.depositFund({ from: accounts[0], value: 900 })

            const prevBalance = new BN(await web3.eth.getBalance(nftDividend_contract.address));

            await nftDividend_contract.emergencyWithdraw();

            const curBalance = new BN(await web3.eth.getBalance(nftDividend_contract.address));
            assert.equal(prevBalance.sub(curBalance).toNumber(), 900);
            assert.equal(curBalance.toNumber(), 0);
        })
    })
})