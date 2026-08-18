import sys
import pandas as pd


def main():
    if len(sys.argv) != 3:
        print("Usage: to_pickle.py <input_csv> <output_pkl>", file=sys.stderr)
        sys.exit(1)
    csv_path, pkl_path = sys.argv[1], sys.argv[2]
    df = pd.read_csv(csv_path)
    df.to_pickle(pkl_path)


if __name__ == "__main__":
    main()
