// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

interface INFTDividend {
    function registerSecondaryContractNFT (uint[] calldata tokenIds, uint[] calldata noShares, uint count) external;
}

contract SecondaryERC721Mock is ERC721 {
    address nftDividendContractAddress;

    constructor(string memory name, string memory symbol, address contractAddress)
        ERC721(name, symbol)
    {
        nftDividendContractAddress = contractAddress;
    }

    function baseURI() public view returns (string memory) {
        return _baseURI();
    }

    function exists(uint256 tokenId) public view returns (bool) {
        return _exists(tokenId);
    }

    function mint(address to, uint256 tokenId) public {
        _mint(to, tokenId);
    }

    function safeMint(address to, uint256 tokenId) public {
        _safeMint(to, tokenId);
    }

    function burn(uint256 tokenId) public {
        _burn(tokenId);
    }

    function registerSecondaryContractNFT (uint[] calldata tokenIds, uint[] calldata noShares, uint count) external {
        INFTDividend(nftDividendContractAddress).registerSecondaryContractNFT(tokenIds, noShares, count);
    }
}
