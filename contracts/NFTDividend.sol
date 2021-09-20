// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @notice Dividend contract for MasterBrew NFT Marketplace
 */
contract NFTDividend is Ownable {

    /// @notice main and secondary ERC721 contract Addresses
    address public mainContractAddress;
    address public secondaryContractAddress;
    
    /// @notice variables related to main contract

    uint constant public MAIN_SHARES_PER_TOKEN = 10;
    uint constant public MAIN_TOKENID_RANGE_START = 1000;
    uint constant public MAIN_TOKENID_RANGE_END = 2000;
    mapping(uint => uint) public mainTokenIdToNoShares;

    /// @notice variables related to secondary contract
    mapping(uint => uint) public secondaryTokenIdToNoShares;

    /// @notice
    uint public allocationPerShare;
    uint public totalNoShare;

    /// @notice events
    event mainContractNFTsRegistered(uint[] indexed tokenIds, uint indexed count);
    event secondaryContractNFTsRegistered(uint[] indexed tokenIds, uint[] indexed noShares, uint indexed count);
    event fundDeposited(uint indexed amount);
    event mainNFTWithdrawn(uint indexed tokenId);
    event secondaryNFTWithdrawn(uint indexed tokenId);
    event nftArrayWithdrawn(uint[] indexed mainTokenIds, uint[] indexed secondaryTokenIds, uint mainTokenCount, 
        uint secondaryTokenCount);
    event emergencyWithdrawn(uint indexed amount);


    mapping(uint => uint) public mainTokenIdToWithdrawnAllocation;
    mapping(uint => uint) public secondaryTokenIdToWithdrawnAllocation;

    function transfer(address to, uint amount) internal {
        address payable payableTo = payable(to);
        payableTo.transfer(amount);
    }

    function setMainContractAddress(address mainAddress) external onlyOwner {
        mainContractAddress = mainAddress;
    }

    function setSecondaryContractAddress(address secondaryAddress) external onlyOwner {
        secondaryContractAddress = secondaryAddress;
    }

    /**
     * @dev Owner of contract can register the main contract tokens
     * @param tokenIds main contract tokenIds
     * @param count token count for register
     */
    function registerMainContactNFTs(uint[] calldata tokenIds, uint count) external onlyOwner {
        for(uint i = 0; i < count; i++) {
            require(
                (tokenIds[i] >= MAIN_TOKENID_RANGE_START) && (tokenIds[i] <= MAIN_TOKENID_RANGE_END),
                "tokenId invalid"
            );
        }

        for(uint i = 0; i < count; i++) {
            if(mainTokenIdToNoShares[tokenIds[i]] > 0)
                continue;
            
            mainTokenIdToNoShares[tokenIds[i]] = MAIN_SHARES_PER_TOKEN;
            mainTokenIdToWithdrawnAllocation[tokenIds[i]] = MAIN_SHARES_PER_TOKEN * allocationPerShare;
            totalNoShare += MAIN_SHARES_PER_TOKEN;
        }
        emit mainContractNFTsRegistered(tokenIds, count);
    }

    /**
     * @dev secondary contract can register the secondary contract tokens by itself
     * @param tokenIds secondary contract tokenIds
     * @param noShares secondary contract tokens' noShare
     * @param count token count for register
     */
    function registerSecondaryContractNFT (uint[] calldata tokenIds, uint[] calldata noShares, uint count) external {
        require(msg.sender == secondaryContractAddress, "only secondary contract");

        for(uint i = 0; i < count; i++) {
            IERC721(secondaryContractAddress).ownerOf(tokenIds[i]);
        }

        for(uint i = 0; i < count; i++) {
            if(secondaryTokenIdToNoShares[tokenIds[i]] > 0)
                continue;

            secondaryTokenIdToNoShares[tokenIds[i]] = noShares[i];
            secondaryTokenIdToWithdrawnAllocation[tokenIds[i]] = noShares[i]* allocationPerShare;
            totalNoShare += noShares[i];
        }
        emit secondaryContractNFTsRegistered(tokenIds, noShares, count);
    }

    /**
     * @dev deposit ether to the contract by owner
     */
    function depositFund() external payable onlyOwner {
        allocationPerShare += (msg.value / totalNoShare);
        emit fundDeposited(msg.value);
    }

    /**
     * @dev withdraw allocation by owner of register token
     * @param tokenId tokenId of main NFT
     */
    function withdrawMainNFT(uint tokenId) external {
        require(IERC721(mainContractAddress).ownerOf(tokenId) == msg.sender, "not owner");
        require(mainTokenIdToNoShares[tokenId] != 0, "tokenId not registered");

        uint withdrawAmount;
        withdrawAmount = (mainTokenIdToNoShares[tokenId] * allocationPerShare - mainTokenIdToWithdrawnAllocation[tokenId]);

        require(withdrawAmount > 0, "already withdrawn");

        mainTokenIdToWithdrawnAllocation[tokenId] += withdrawAmount;

        transfer(msg.sender, withdrawAmount);
        emit mainNFTWithdrawn(tokenId);
    }

    /**
     * @dev withdraw allocation by owner of register token
     * @param tokenId tokenId of secondary NFT
     */
    function withdrawSecondaryNFT(uint tokenId) external {
        require(IERC721(secondaryContractAddress).ownerOf(tokenId) == msg.sender, "not owner");
        require(secondaryTokenIdToNoShares[tokenId] != 0, "tokenId not registered");

        uint withdrawAmount;
        withdrawAmount = (secondaryTokenIdToNoShares[tokenId] * allocationPerShare - secondaryTokenIdToWithdrawnAllocation[tokenId]);

        require(withdrawAmount > 0, "already withdrawn");

        secondaryTokenIdToWithdrawnAllocation[tokenId] += withdrawAmount;

        transfer(msg.sender, withdrawAmount);
        emit secondaryNFTWithdrawn(tokenId);
    }

    /**
     * @dev withdraw allocation by owner of register tokens
     * @param mainTokenIds tokenIds of main NFT
     * @param secondaryTokenIds tokenIds of secondary NFT
     * @param mainTokenCount token count of main NFT
     * @param secondaryTokenCount token count of secondary NFT
     */
    function withdrawArray(uint[] calldata mainTokenIds, uint[] calldata secondaryTokenIds, uint mainTokenCount, 
     uint secondaryTokenCount) external {
        uint withdrawAmount;

        for(uint i = 0; i < mainTokenCount; i++) {
            require(IERC721(mainContractAddress).ownerOf(mainTokenIds[i]) == msg.sender, "not owner");
            require(mainTokenIdToNoShares[mainTokenIds[i]] != 0, "tokenId is not registered");

            withdrawAmount += (mainTokenIdToNoShares[mainTokenIds[i]] * allocationPerShare 
                - mainTokenIdToWithdrawnAllocation[mainTokenIds[i]]);
            mainTokenIdToWithdrawnAllocation[mainTokenIds[i]] = (mainTokenIdToNoShares[mainTokenIds[i]] * allocationPerShare);
        }
        for(uint i = 0; i < secondaryTokenCount; i++) {
            require(IERC721(secondaryContractAddress).ownerOf(secondaryTokenIds[i]) == msg.sender, "not owner");
            require(secondaryTokenIdToNoShares[secondaryTokenIds[i]] != 0, "tokenId is not registered");

            withdrawAmount += (secondaryTokenIdToNoShares[secondaryTokenIds[i]] * allocationPerShare 
                - secondaryTokenIdToWithdrawnAllocation[secondaryTokenIds[i]]);
            secondaryTokenIdToWithdrawnAllocation[secondaryTokenIds[i]] = (secondaryTokenIdToNoShares[secondaryTokenIds[i]] * allocationPerShare);
        }

        require(withdrawAmount > 0, "already withdrawn");
        transfer(msg.sender, withdrawAmount);
        emit nftArrayWithdrawn(mainTokenIds, secondaryTokenIds, mainTokenCount, secondaryTokenCount);
    }

    function emergencyWithdraw() external onlyOwner {
        transfer(msg.sender, address(this).balance);
        emit emergencyWithdrawn(address(this).balance);
    }
}