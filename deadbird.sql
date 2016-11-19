-- phpMyAdmin SQL Dump
-- version 4.6.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Nov 19, 2016 at 12:43 AM
-- Server version: 5.7.15
-- PHP Version: 5.6.25

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `deadbird`
--

-- --------------------------------------------------------

--
-- Table structure for table `handles`
--

CREATE TABLE `handles` (
  `id` int(11) NOT NULL,
  `handle` varchar(32) NOT NULL,
  `template` int(11) NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `handles`
--

INSERT INTO `handles` (`id`, `handle`, `template`) VALUES
(1, 'katyperry', 0),
(2, 'justinbieber', 0),
(3, 'taylorswift13', 0),
(4, 'barackobama', 0),
(5, 'rihanna', 0),
(6, 'youtube', 0),
(7, 'ladygaga', 0),
(8, 'theellenshow', 0),
(9, 'twitter', 0),
(10, 'jtimberlake', 0),
(11, 'kimkardashian', 0),
(12, 'britneyspears', 0),
(13, 'cristiano', 0),
(14, 'selenagomez', 0),
(15, 'cnnbrk', 0),
(16, 'jimmyfallon', 0),
(17, 'arianagrande', 0),
(18, 'shakira', 0),
(19, 'instagram', 0),
(20, 'ddlovato', 0),
(21, 'jlo', 0),
(22, 'oprah', 0),
(23, 'drake', 0),
(24, 'kingjames', 0),
(25, 'billgates', 0),
(26, 'nytimes', 0),
(27, 'onedirection', 0),
(28, 'kevinhart4real', 0),
(29, 'mileycyrus', 0),
(30, 'sportscenter', 0),
(31, 'espn', 0),
(32, 'harry_styles', 0),
(33, 'cnn', 0),
(34, 'pink', 0),
(35, 'liltunechi', 0),
(36, 'wizkhalifa', 0),
(37, 'niallofficial', 0),
(38, 'adele', 0),
(39, 'brunomars', 0),
(40, 'bbcbreaking', 0),
(41, 'kanyewest', 0),
(42, 'kaka', 0),
(43, 'neymarjr', 0),
(44, 'actuallynph', 0),
(45, 'danieltosh', 0),
(46, 'aliciakeys', 0),
(47, 'narendramodi', 0),
(48, 'nba', 0),
(49, 'liampayne', 0),
(50, 'louis_tomlinson', 0),
(51, 'srbachchan', 0),
(52, 'emmawatson', 0),
(53, 'pitbull', 0),
(54, 'khloekardashian', 0),
(55, 'conanobrien', 0),
(56, 'iamsrk', 0),
(57, 'kourtneykardash', 0),
(58, 'realmadrid', 0),
(59, 'eminem', 0),
(60, 'davidguetta', 0),
(61, 'nickiminaj', 0),
(62, 'nfl', 0),
(63, 'avrillavigne', 0),
(64, 'zaynmalik', 0),
(65, 'kendalljenner', 0),
(66, 'beingsalmankhan', 0),
(67, 'nasa', 0),
(68, 'fcbarcelona', 0),
(69, 'aamir_khan', 0),
(70, 'kyliejenner', 0),
(71, 'blakeshelton', 0),
(72, 'chrisbrown', 0),
(73, 'coldplay', 0),
(74, 'aplusk', 0),
(75, 'vine', 0),
(76, 'theeconomist', 0),
(77, 'mariahcarey', 0),
(78, 'edsheeran', 0),
(79, 'leodicaprio', 0),
(80, 'bbcworld', 0),
(81, 'deepikapadukone', 0),
(82, 'google', 0),
(83, 'xtina', 0),
(84, 'agnezmo', 0),
(85, 'mohamadalarefe', 0),
(86, 'shugairi', 0),
(87, 'ricky_martin', 0),
(88, 'twitterespanol', 0),
(89, 'priyankachopra', 0),
(90, 'jimcarrey', 0),
(91, 'reuters', 0),
(92, 'ihrithik', 0),
(93, 'kdtrey5', 0),
(94, 'ivetesangalo', 0),
(95, 'ryanseacrest', 0),
(96, 'alejandrosanz', 0),
(97, 'snoopdogg', 0),
(98, 'akshaykumar', 0),
(99, 'twittersports', 0),
(100, 'beyonce', 0);

-- --------------------------------------------------------

--
-- Table structure for table `tweets`
--

CREATE TABLE `tweets` (
  `id` int(11) NOT NULL,
  `handle` int(11) NOT NULL,
  `tweetid` varchar(32) COLLATE utf8_unicode_ci NOT NULL,
  `date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fetchDate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleteDate` timestamp NULL DEFAULT NULL,
  `content` text COLLATE utf8_unicode_ci,
  `tweetSaved` int(11) NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `handles`
--
ALTER TABLE `handles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `handle` (`handle`);

--
-- Indexes for table `tweets`
--
ALTER TABLE `tweets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `asdf` (`handle`,`tweetid`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `handles`
--
ALTER TABLE `handles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=101;
--
-- AUTO_INCREMENT for table `tweets`
--
ALTER TABLE `tweets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
